import authAxios from "@/lib/authAxios";

export const loginUser = async (username: string, password: string) => {
  const response = await authAxios.post("/login", { username, password });
  return response.data;
};

export const checkUserActiveStatus = async () => {
  const response = await authAxios.get("/user/active-status");
  return response.data;
};


