import React, { useState } from "react";
import { Data } from "../data/json/datosuser";
import DeleteuserModal from "../components/modals/delete_user";

function Usuarios() {
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // Guarda el usuario a eliminar

  // Abre la modal con el usuario seleccionado
  const openDeleteModal = (usuario) => {
    setSelectedUser(usuario);
    setDeleteOpen(true);
  };

  // Cierra la modal y resetea el usuario seleccionado
  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setSelectedUser(null);
  };

  // Acción cuando se confirma la eliminación
  const handleDelete = () => {
    console.log("Usuario eliminado:", selectedUser);
    closeDeleteModal();
  };

  return (
    <div className="views view-usuarios">
      <h2>Usuarios</h2>
      <section className="user-tables">
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Nombres</th>
              <th scope="col">Apellidos</th>
              <th scope="col">Cedula</th>
              <th scope="col">Genero</th>
              <th scope="col">Correo</th>
              <th scope="col">Fecha de Nacimiento</th>
              <th scope="col">Libros Prestados</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Data.map((usuario) => (
              <tr key={usuario.id}>
                <th scope="row">{usuario.id}</th>
                <td>{usuario.nombres}</td>
                <td>{usuario.apellidos}</td>
                <td>{usuario.cedula}</td>
                <td>{usuario.genero}</td>
                <td>{usuario.correo}</td>
                <td>{usuario.fechaNacimiento}</td>
                <td>{usuario.librosPrestados}</td>
                <td>
                  <button className="btn btn-primary">
                    <i className="bi bi-pencil-fill"></i>
                  </button>
                  <button
                    onClick={() => openDeleteModal(usuario)}
                    className="btn btn-danger"
                  >
                    <i className="bi bi-trash-fill"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* Modal para eliminar */}
      <DeleteuserModal
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        user={selectedUser}
      />
    </div>
  );
}

export default Usuarios;
