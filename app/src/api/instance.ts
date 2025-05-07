import axios from "axios";
import { BaseUrl } from "./baseUrl";

const returnInstanceApi = () => {
  const http = axios.create({
    baseURL: BaseUrl,
  });

  const storage = localStorage.getItem("user");

  const token = storage ? JSON.parse(storage).token : "";

  http.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  return http;
};

export default returnInstanceApi;
