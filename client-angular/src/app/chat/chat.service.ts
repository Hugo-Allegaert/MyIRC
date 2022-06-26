import * as io from 'socket.io-client';
import {Observable} from 'rxjs/Observable';
import {Message} from './message.model';

export class ChatService {
  private url = 'http://localhost:8080';
  private socket;
  public username;
  private message = new Message();
  private messages = [];

  constructor() {
    this.username = prompt('Quel est votre pseudo ?');
    this.socket = io.connect(this.url);
    this.socket.on('connect', connect => (this.socket.emit('add_user', this.username)));
  }
  public sendMessage(message) {
    this.socket.emit('sendchat', message);
  }
  public changeRoom(room) {
    this.socket.emit('switch_room', room);
  }
  public createRoom(newroom) {
    this.socket.emit('add_rooms', newroom);
  }
  public getMessages = () => {
    return new Observable<Message>((observer) => {
      this.socket.on('update_chat', (username, message) => {
        this.message = new Message();
        this.message.username = username;
        this.message.message = message;
        if (username === this.username) {
          this.message.userMe = 0;
        } else if (username === 'SERVER' || username === 'SERVER_PV') {
          this.message.userMe = 1;
        } else {
          this.message.userMe = 2;
        }
        observer.next(this.message);
      });
    });
  }
  public getPrivateMessage(user) {
    this.socket.emit('get_private_message');
    return new Observable<any>( (observer) => {
      this.socket.on('return_private_message', (data) => {
        this.messages = [];
        data.forEach(message => {
          if (message.from === this.username && message.to === user) {
            this.message = new Message();
            this.message.message = message.message;
            this.message.userMe = 0;
            this.messages = [...this.messages, this.message];
          }
          if (message.from === user && message.to === this.username) {
            this.message = new Message();
            this.message.username = user;
            this.message.message = message.message;
            this.message.userMe = 2;
            this.messages = [...this.messages, this.message];
          }
        });
        observer.next(this.messages);
      });
    });
  }
  public getUsers(room) {
    this.socket.emit('get_user_in_room', room);
    return new Observable<string[]>((observer) => {
      this.socket.on('return_user_in_room', (userinroom) => {
        observer.next(userinroom);
      });
    });
  }
  public getRoomMessages() {
    return new Observable<Message[]>((observer) => {
      this.messages = [];
      this.socket.on('update_chat_maj', (data) => {
        this.messages = [];
        data.forEach(message => {
          this.message = new Message();
          this.message.username = message.user;
          this.message.message = message.message;
          if (message.user === this.username) {
            this.message.userMe = 0;
          } else if (message.user === 'SERVER' || message.user === 'SERVER_PV') {
            this.message.userMe = 1;
          } else {
            this.message.userMe = 2;
          }
          this.messages = [...this.messages, this.message];
        });
        observer.next(this.messages);
      });
    });
  }
}
