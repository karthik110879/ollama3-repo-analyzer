import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AnalyzerService {
  private apiUrl = 'http://localhost:3000/api/analyze';

  constructor(private http: HttpClient) {}

  analyzeRepository(repositoryUrl: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { repositoryUrl })
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'Unknown error';
    if (error.error instanceof ErrorEvent) {
      message = error.error.message;
    } else if (error.error?.message) {
      message = error.error.message;
    } else if (error.message) {
      message = error.message;
    }
    return throwError(() => new Error(message));
  }
}
