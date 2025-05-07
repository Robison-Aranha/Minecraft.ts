import returnInstanceApi from "../instance";

export const useGameApi = () => {
  const http = returnInstanceApi();

  const createWorld = async (formData: FormData) => {
    const response = await http.post("/game", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  };

  const listWorlds = async () => {
    const response = await http.get("/game");

    return response.data;
  };

  const deleteWorld = async (id: number) => {
    const response = await http.delete("/game/" + id);

    return response.data;
  };

  return { createWorld, listWorlds, deleteWorld };
};
