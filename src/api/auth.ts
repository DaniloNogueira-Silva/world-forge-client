import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export type SignUpPayload = {
  username: string;
  email: string;
  password: string;
};

export type SignInPayload = {
  email: string;
  password: string;
};

export async function signUp(payload: SignUpPayload) {
  await axios.post(`${BASE_URL}/auth/signup`, payload);
}

export async function signIn(payload: SignInPayload): Promise<string> {
  const { data } = await axios.post<{ accessToken?: string }>(
    `${BASE_URL}/auth/signin`,
    payload
  );

  if (!data?.accessToken) {
    throw new Error("O servidor não retornou um token de acesso.");
  }

  return data.accessToken;
}
