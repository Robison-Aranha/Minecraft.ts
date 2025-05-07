import returnInstanceApi from "../instance";

export const useLoginRegister = () => {
  const http = returnInstanceApi();

  const register = async (username: string, password: string) => {
    const data = {
      username: username,
      password: password,
    };

    const response = await http.post("/register", data);

    return response.data;
  };

  const login = async (username: string, password: string) => {
    const data = {
      username: username,
      password: password,
    };

    const response = await http.post("/login", data);

    return response.data;
  };

  const logout = async () => {
    await http.get("/logout");
  };

  return { login, logout, register };
};
