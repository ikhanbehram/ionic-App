/* eslint-disable arrow-body-style */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Key } from 'protractor';
import { BehaviorSubject } from 'rxjs';
import { delay, map, switchMap, take, tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Booking } from '../models/booking.model';

interface BookingData {
  bookedFrom: string;
  firstname: string;
  guestNumber: number;
  lastName: string;
  placeId: string;
  placeImg: string;
  placeTitle: string;
  userId: string;
}

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private _bookings = new BehaviorSubject<Booking[]>([]);

  get bookings() {
    return this._bookings.asObservable();
  }

  constructor(private authService: AuthService, private http: HttpClient) {}

  addBooking(
    placeId: string,
    placeTitle: string,
    placeImg: string,
    firstName: string,
    lastName: string,
    guestNumber: number,
    dateFrom: Date,
    dateTo: Date
  ) {
    let generatedId: string;
    let newBooking: Booking;
    return this.authService.userId.pipe(
      take(1),
      switchMap((userId) => {
        if (!userId) {
          throw new Error('no user id found!');
        }
        newBooking = new Booking(
          Math.random.toString(),
          placeId,
          userId,
          placeTitle,
          placeImg,
          firstName,
          lastName,
          guestNumber,
          dateFrom,
          dateTo
        );
        return this.http.post<{ name: string }>(
          'https://ion-app-e8ff9-default-rtdb.asia-southeast1.firebasedatabase.app/bookings.json',
          { ...newBooking, id: null }
        );
      }),
      switchMap((resData) => {
        resData.name;
        return this.bookings;
      }),
      take(1),
      tap((bookings) => {
        newBooking.id = generatedId;
        this._bookings.next(bookings.concat(newBooking));
      })
    );
  }

  fetchBookings() {
    return this.authService.userId.pipe(
      switchMap((userId) => {
        if (!userId) {
          throw new Error('User not found');
        }
        return this.http.get<{ [key: string]: Booking }>(
          `https://ion-app-e8ff9-default-rtdb.asia-southeast1.firebasedatabase.app/bookings.json?orderBy="userId"&equalTo"${userId}"`
        );
      }),
      map((bookingsData) => {
        const bookings = [];
        for (const key in bookingsData) {
          if (bookingsData.hasOwnProperty(key)) {
            bookings.push(
              new Booking(
                key,
                bookingsData[key].placeId,
                bookingsData[key].userId,
                bookingsData[key].placeTitle,
                bookingsData[key].placeImg,
                bookingsData[key].firstname,
                bookingsData[key].lastName,
                bookingsData[key].guestNumber,
                new Date(bookingsData[key].bookedFrom),
                new Date(bookingsData[key].bookedTo)
              )
            );
          }
        }
        return bookings;
      }),
      tap((bookings) => {
        this._bookings.next(bookings);
      })
    );
  }

  cancelBooking(bookingId: string) {
    return this.http
      .delete(
        `https://ion-app-e8ff9-default-rtdb.asia-southeast1.firebasedatabase.app/bookings/${bookingId}.json`
      )
      .pipe(
        switchMap(() => {
          return this.bookings;
        }),
        take(1),
        tap((bookings) => {
          this._bookings.next(
            bookings.filter((b) => {
              b.id = bookingId;
            })
          );
        })
      );
  }
}
