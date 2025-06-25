import axios from "axios";

const authAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL + "/auth",
  headers: {
    "Content-Type": "application/json",
  },
});

export default authAxios;
