export interface BaseResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T | null;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  input: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiredAt: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface CurrentUserResponse {
  id: number;
  refCode: string;
  username: string;
  email: string;
  role?: string;
}