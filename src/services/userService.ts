import authAxios from "@/lib/authAxios";

export const loginUser = async (username: string, password: string) => {
  const response = await authAxios.post("/login", { username, password });
  return response.data;
};
