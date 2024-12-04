import axios from "axios";

// Kreirajte instancu axios-a sa osnovnim URL-om
const axiosInstance = axios.create({
  baseURL: "http://localhost:3000", // URL vašeg backend servera
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
