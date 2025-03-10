// routes.jsx
import { Routes, Route } from "react-router-dom";
import Login from "./views/login";
import Register from "./views/register";
import Dashboard_admin from "./views/dashboard_admin";
import Navbar from "./layouts/nav/navbar";
import Catalogo from "./views/catalogo";
import Usuarios from "./views/usuarios";
import Estadisticas from "./views/estadisticas";
import New_book from "./views/new_book";
import Recovery_password from "./views/recovery_password";
import Perfil from "./views/perfil";
import Favorites_book from "./views/favorites_book";
import Inicioadmin from "./views/inicio_admin";
import Books_information from "./views/books_information";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/recovery" element={<Recovery_password />} />
      <Route path="/dashboard" element={<Dashboard_admin />} />
      {/* panel de admin */}
      <Route path="/nav" element={<Navbar />}>
        <Route index element={<Inicioadmin />} /> {/* Ruta predeterminada */}
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="estadisticas" element={<Estadisticas />} />
        <Route path="new_book" element={<New_book />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="favorites" element={<Favorites_book />} />
        <Route path="catalogo/book/:id" element={<Books_information />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
