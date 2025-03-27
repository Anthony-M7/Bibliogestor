import React, { useState, useEffect } from "react";
import DeleteuserModal from "../components/modals/delete_user";
import EdituserModal from "../components/modals/edit_user";

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedEdit, setSelectedEdit] = useState(null);

  const openDeleteModal = (usuario) => {
    setSelectedUser(usuario);
    setDeleteOpen(true);
  };

  // Cierra la modal de eliminar
  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setSelectedUser(null);
  };

  // Abre la modal de editar
  const openEditModal = (usuario) => {
    setSelectedEdit(usuario);
    setEditOpen(true);
  };

  // Cierra la modal de editar
  const closeEditModal = () => {
    setEditOpen(false);
    setSelectedEdit(null);
  };

  // Acción cuando se confirma la eliminación
  const handleDelete = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/usuarios/${selectedUser.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Error al eliminar el usuario");
      }

      // Después de eliminar, actualiza el estado de los usuarios
      setUsuarios(usuarios.filter((usuario) => usuario.id !== selectedUser.id));
      closeDeleteModal(); // Cierra la modal después de eliminar
    } catch (error) {
      console.error("❌ Error al eliminar el usuario:", error);
    }
  };

  // ✅ Función para obtener usuarios desde la API
  const fetchUsuarios = async () => {
    try {
      const response = await fetch("http://localhost:5000/usuarios");
      if (!response.ok) throw new Error("Error al obtener usuarios");

      const data = await response.json();

      // console.log(data)
      // Verificar si `data` es un array
      if (Array.isArray(data)) {
        setUsuarios(data); // ✅ Si es array, guárdalo directamente
      } else {
        setUsuarios([data]); // 🔥 Si es objeto, conviértelo en array
      }
    } catch (error) {
      console.error("❌ Error al cargar usuarios:", error);
    }
  };

  // ✅ Llamar `fetchUsuarios` cuando el componente se monte
  useEffect(() => {
    fetchUsuarios();
  }, []);

  return (
    <div className="views view-usuarios">
      <h2>Usuarios</h2>
      <section className="user-tables">
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombres</th>
              <th>Apellidos</th>
              <th>Cédula</th>
              <th>Género</th>
              <th>Correo</th>
              <th>Fecha de Nacimiento</th>
              <th>Sanciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length > 0 ? (
              usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.id}</td>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.apellidos}</td>
                  <td>{usuario.cedula}</td>
                  <td>{usuario.genero}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.fecha_nacimiento}</td>
                  <td>{usuario.sanciones}</td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedEdit(usuario); // Asigna el usuario a editar
                        setEditOpen(true); // Abre el modal
                      }}
                      className="btn btn-primary"
                    >
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
              ))
            ) : (
              <tr>
                <td colSpan="9" className="text-center">
                  Cargando usuarios...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Modal para eliminar */}
      <DeleteuserModal
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        user={selectedUser} // Pasar el usuario seleccionado
      />

      {/* Modal para editar */}
      <EdituserModal
        isOpen={isEditOpen} // Controla si el modal está abierto
        onClose={() => setEditOpen(false)} // Cierra el modal
        user={selectedEdit} // Pasa el usuario a editar
      />
    </div>
  );
}

export default Usuarios;
