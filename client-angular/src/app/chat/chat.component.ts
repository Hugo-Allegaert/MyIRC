import {AfterViewChecked, Component, OnInit} from '@angular/core';
import { ChatService } from './chat.service';
import { Message } from './message.model';

import 'rxjs/add/operator/filter';

@Component({
  selector: 'app-chat',
  templateUrl: 'chat.component.html',
  styleUrls: ['chat.component.css']
})
export class ChatComponent implements OnInit {
  username: '';
  message: any;
  messages = [];
  room = 'General';
  rooms = ['General', 'room 1', 'room 2', 'room 3'];
  users: string[] = [];
  friends: string[] = [];
  newroom: string;
  privateUser = '';

  constructor(private chatService: ChatService) {
    this.username = this.chatService.username;
  }
  sendMessage() {
    console.log('MSG');
    console.log(this.room);
    console.log(this.message);
    if (this.room === 'PRIVATE') {
      this.message = '@'.concat(this.privateUser, ' ', this.message);
    }
    this.chatService.sendMessage(this.message);
    this.message = '';
  }
  switchRoom(room) {
    this.messages = [];
    this.room = room;
    this.chatService.changeRoom(room);
    this.chatService.getUsers(this.room).subscribe((data: string[]) => {
      this.users = data;
    });
    this.chatService.getRoomMessages().subscribe((data: Message[]) => {
      this.messages = data;
    });
  }
  createRoom() {
    if (this.newroom.length > 0 && this.rooms.includes(this.newroom) === false) {
      this.chatService.createRoom(this.newroom);
      this.rooms = [...this.rooms, this.newroom];
    }
  }
  deleteRoom(delroom) {
    if (delroom !== 'General') {
      this.rooms = this.rooms.filter(item => item !== delroom);
      if (this.room === delroom) {
        this.room = 'General';
        this.switchRoom('General');
      }
    }
  }
  addFriend(user) {
    if (this.friends.includes(user) === false) {
      this.friends = [...this.friends, user];
    }
  }
  delFriend(user) {
    let friendstmp = [];
    this.friends.forEach(friend => {
      if (friend !== user) {
        friendstmp = [...friendstmp, friend];
      }
    });
    this.friends = friendstmp;
  }
  privateMsg(user) {
    this.privateUser = user;
    this.room = 'PRIVATE';
    this.messages = [];
    this.chatService.getPrivateMessage(user).subscribe((data: Message[]) => {
      this.messages = data;
    });
  }
  ngOnInit() {
    this.chatService.getUsers(this.room).subscribe((data: string[]) => {
      this.users = data;
    });
    this.chatService
      .getMessages()
      .subscribe((newMessage: Message) => {
        this.chatService.getUsers(this.room).subscribe((data: string[]) => {
          this.users = data;
        });
        if (this.room !== 'PRIVATE') {
          const nd = new Date();
          const data = {
            username: newMessage.username,
            message: newMessage.message,
            userMe: newMessage.userMe,
            time: nd.getHours() + ':' + nd.getMinutes()
          };
          this.messages = [...this.messages, data];
        } else if (this.room === 'PRIVATE') {
          this.messages = [];
          this.chatService.getPrivateMessage(this.privateUser).subscribe((data: Message[]) => {
            this.message = [];
            this.messages = data;
          });
        }
      });
  }
}
