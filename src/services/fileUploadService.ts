import fileUploadAxios from "@/lib/fileUploadAxios";

export const excelFileUploadForDevice = async (
  file: File,
  schoolId: string,
  branchId: string
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("schoolId", schoolId);
  formData.append("branchId", branchId);

  const response = await fileUploadAxios.post("/device/upload-excel", formData);

  return response.data;
};
