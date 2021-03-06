import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { User } from '../_models';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    public currentUserSubject: BehaviorSubject<User>;
    public currentUser: Observable<User>;
    public base_url: string;

    constructor(private http: HttpClient) {
        this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): User {
        return this.currentUserSubject.value;
    }

    login(organization: string, username: string, password: string): Observable<any> {
        let orgs = organization.split('/');
        const body = new HttpParams()
            .set('org_id', orgs[0])
            .set('username', username)
            .set('password', password);
        return this.http.post<any>(`https://${this.base_url}/api/1.0/login.php`,body.toString(), 
            { headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')})
            .pipe(map(user => {
                // login successful if there's a jwt token in the response
                if (user && user.access_token) {
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    localStorage.setItem('org_id', orgs[0]);
                    localStorage.setItem('base_url', this.base_url);
                    localStorage.setItem('org_name', orgs[2]);
                    localStorage.setItem('contact_name', orgs[1]);
                    localStorage.setItem('contact_id', orgs[3]);
    
                    let breadcrumb = {}
                    breadcrumb[orgs[0]] = {name: orgs[2], parent_id: ''}
                    localStorage.setItem('ent_breadcrumb', JSON.stringify(breadcrumb))
                    
                    this.currentUserSubject.next(user);
                }

                return user;
            }));
    }

    get_org(email: string) {
        const body = new HttpParams()
            .set('email', email)
            .set('password', 'bluehippo13');

        return this.http.post<any>(`https://${this.base_url}/api/1.0/getorgs.php`,body.toString(), 
            { headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')})
            .pipe(map(orgs => {
                return orgs;
            }));
    }

    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem('currentUser')
        localStorage.removeItem('org_id')
        localStorage.removeItem('base_url')
        localStorage.removeItem('org_name')
        localStorage.removeItem('contact_name')
        localStorage.removeItem('dashboard')
        localStorage.removeItem('forceToken')
        localStorage.removeItem('ent_breadcrumb')
        localStorage.removeItem('contact_id')
        this.currentUserSubject.next(null);
    }
}