import { useState } from "react";
import PropTypes from "prop-types";
import Logo from "../../assets/imgs/Logo_BiblioGestor.png";
import { redirect } from "react-router-dom";

const ADMIN_KEY = "ADMIN_DELETE"; // 🔑 Define la clave de administrador aquí

function DeleteBookModal({ isOpen, onClose, onConfirm, bookId, bookTitle }) {
  const [adminKeyInput, setAdminKeyInput] = useState(""); // Estado para la clave ingresada
  const [error, setError] = useState(""); // Estado para errores

  const handleDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/libros/delete/${bookId}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          'admin-key': ADMIN_KEY
        },
        credentials: 'same-origin' // Cambia esto (lee la explicación abajo)
      });
  
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar el libro");
      }
  
      const data = await response.json();
      alert(data.message || "📚 Libro eliminado exitosamente");
      onConfirm();
      onClose();
      setAdminKeyInput("");
      setError("");
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
      setError(error.message);
    }
  };

  return (
    <div
      className={`modal fade ${isOpen ? "show d-block" : ""}`}
      tabIndex="-1"
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        role="document"
      >
        <div className="modal-content">
          <div className="modal-header">
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={onClose}
            />
            <img className="modal-image" src={Logo} alt="Logo" />
            <h5 className="modal-title">Eliminar Libro</h5>
          </div>
          <div className="modal-body">
            <p>
              ¿Estás seguro de que deseas eliminar el libro{" "}
              <strong>{bookTitle}</strong>?
            </p>
            <form className="form-leed-book">
              <div className="position-form-books-leed">
                <label className="form-label labels-form-book">
                  ADMIN KEY:
                </label>
                <input
                  type="password"
                  className="form-control inputs-form-book"
                  placeholder="ADMIN KEY"
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                />
                {error && (
                  <p style={{ color: "red", marginTop: "5px" }}>{error}</p>
                )}
              </div>
            </form>
            <p>
              ⚠️ <strong>NOTA:</strong> Esta acción no tiene reversión.
            </p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
            >
              Sí, Eliminar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Validación de props con PropTypes
DeleteBookModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  bookId: PropTypes.number.isRequired, // Asegurar que bookId es un número
  bookTitle: PropTypes.string.isRequired,
};

export default DeleteBookModal;
