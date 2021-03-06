import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AppData } from '../../providers/app-data.service';
import { ApiService } from '../../providers/api.service';
import { UtilitiesService } from '../../providers/utilities.service';
import { Equipment, EquipmentType } from '../../models/equipment.model';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  // Get types from enum
  public types: Array<string> = Object.keys(EquipmentType).slice(Object.keys(EquipmentType).length/2);
  public searchTopic: string;
  public searchResults: Array<any>;
  public searchValue: string = '';
  public equipmentType: string = 'All Types';
  public equipment: any;

  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    public appData: AppData,
    public apiService: ApiService,
    public utilities: UtilitiesService) {

    this.equipment = this.navParams.get('equipment');
    this.searchTopic = this.equipment ? 'Staff' : 'Equipments';
  }

  ionViewCanEnter() {
    // Redirect user to login if not logged in
    if (!this.appData.isLoggedIn()) {
      setTimeout(() => this.navCtrl.setRoot('login'));
    }
    return this.appData.isLoggedIn();
  }

  ionViewWillEnter() {
    // Update table when user accesses page
    this.updateTable();
  }

  /**
   * Updates the display table
   */
  updateTable() {
    let collection: string;
    switch(this.searchTopic) {
      case 'Equipments':
        collection = 'equipments';
        break;
      case 'Lab Assistants':
        collection = 'users';
        break;
      default:
        collection = 'staff';
        break;
    }
    this.apiService.getEntriesByName(this.searchValue, collection).subscribe( data => {
      if (this.searchTopic == 'Equipments') {
        if (this.equipmentType == 'All Types')
          this.searchResults = data;
        else {
          this.searchResults = [];
          for (let entry of data) {
            if (this.equipmentType == entry.type.toString())
              this.searchResults.push(entry);
          }
        }
      }
      else this.searchResults = data;
      console.log('Table successfully updated');
    }, err => {
      console.log('Error updating table', err);
    });
  }

  /**
   * Calls the api to delete an entry from the database
   * @param item The item to be deleted
   */
  deleteEntry(item: any) {
    // Show confirmation alert
    this.utilities.showConfirmationAlert('Are you sure you want to delete entry?', '', () => {
      let collection: string;
      switch(this.searchTopic) {
        case 'Equipments':
          collection = 'equipments';
          break;
        case 'Lab Assistants':
          collection = 'users';
          break;
        default:
          collection = 'staff';
          break;
      }

      // Delete entry
      this.apiService.deleteEntryById(item._id, collection).subscribe(result => {
        if (result) {
          // If staff deleted, free all equipments assigned to them
          if (collection == 'staff') {
            this.apiService.getEquipmentsByStaff(item).subscribe(result => {
              for (let equipment of result) {
                equipment.staff = null;
                this.apiService.updateEntryById(equipment._id, 'equipments', equipment).subscribe(() => {
                  console.log('Removed staff from equipment');
                });
              }
            });
          }

          // Update display table
          this.updateTable();
        }
      }, () => {
        this.utilities.showAlert('Error deleting entry', 'Error');
      });
    });
  }

  /**
   * Redirects to details page after table item is clicked
   *
   * @param item The item whose details to be displayed
   */
  openDetailsPage(item: any) {
    let pageToOpen: string;
    switch(this.searchTopic) {
      case 'Equipments':
        pageToOpen = 'equipment-details';
        break;
      case 'Lab Assistants':
        pageToOpen = 'lab-assistant-details';
        break;
      default:
        pageToOpen = 'staff-details';
        break;
    }
    this.navCtrl.push(pageToOpen, {item: item});
  }

  /**
   * Assigns a staff to the equipment passed by navParams
   *
   * @param staff The staff to be assigned
   */
  assignStaff(staff: any) {
    let newEquipment: Equipment = Object.assign({}, this.equipment); // Copy object
    newEquipment.staff = staff;

    // Update equipment
    this.apiService.updateEntryById(this.equipment._id, 'equipments', newEquipment).subscribe(() => {
      // Update staff
      this.utilities.showAlert('Staff assigned successfully', '', () => {
      // Navigate back to equipment details page
      this.equipment = null;
      this.navCtrl.push('equipment-details', {item: newEquipment});
      });
    }, () => {
      this.utilities.showAlert('Error assigning staff', 'Error');
    });
  }

}
