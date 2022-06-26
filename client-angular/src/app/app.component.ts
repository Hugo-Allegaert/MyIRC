import {AfterViewChecked, Component, OnInit} from '@angular/core';
import { ChatService } from './chat/chat.service';
import { Message} from './chat/message.model';

import 'rxjs/add/operator/filter';
import * as moment from 'moment';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewChecked{
  title = 'client-angular';
  message: string;
  messages: string[] = [];
  constructor(private chatService: ChatService) {
  }
  sendMessage() {
    this.chatService.sendMessage(this.message);
    this.message = '';
  }
  ngOnInit() {
    this.chatService
      .getMessages()
      .subscribe((message: Message) => {
        const currentTime = moment().format('hh:mm:ss a');
        const messageWithTimestamp = `${currentTime}: ${message}`;
        this.messages.push(messageWithTimestamp);
      });
  }
  ngAfterViewChecked() {
  }
}
