import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'footer',
    templateUrl: '../templates/footer.component.html',
    styleUrls: ['../styles/footer.component.css']
})
export class FooterComponent{
    public showModal: boolean = false;
}
