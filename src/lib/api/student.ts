import axios from "@/lib/axios";

export const fetchStudents = async () => {
  const { data } = await axios.get("/child");
  return data.children;
};

export const createStudent = async (payload: unknown) => {
  return axios.post("/child", payload);
};

export const updateStudent = async ({
  id,
  payload,
}: {
  id: string;
  payload: unknown;
}) => {
  const { data } = await axios.put(`/child/${id}`, payload);
  return data;
};

export const deleteStudent = async (id: string) => {
  const { data } = await axios.delete(`/child/${id}`);
  return data;
};
