import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environment/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');

  // Chỉ gắn token khi gọi BE của mình — không gửi token sang API bên ngoài (VietQR, danh mục tỉnh thành, bản đồ...)
  if (!token || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const clonedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(clonedRequest);
};
