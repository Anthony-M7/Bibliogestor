import { redirect, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import DeleteBookModal from "../components/modals/delete_book";
import LeedBookModal from "../components/modals/leed_book";
import useAuthStore from "../store/authstore";
import { getAutores } from "../services/api";
// import {isAdmin} from "../store/authstore";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

function Books_information() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue, // 🔹 Asegúrate de extraer setValue aquí
    getValues,
  } = useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [libro, setLibro] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isLeedOpen, setLeedOpen] = useState(false);
  const { user, isAdmin } = useAuthStore(); // Obtiene el usuario actual
  const [esMiPrestamo, setEsMiPrestamo] = useState(false);
  const [mensajeDevolucion, setMensajeDevolucion] = useState("");
  // modal de editar

  // 📌 Obtener los detalles del libro desde la API
  // 🔄 Definir fetchLibro con useCallback
  const fetchLibro = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/libros/${id}`);
      if (!response.ok) throw new Error("Libro no encontrado");

      const data = await response.json();
      setLibro(data);

      // ✅ Verificar si el usuario actual tiene prestado el libro
      if (data.usuario_prestamo_id === user.id && data.disponible != 1) {
        setEsMiPrestamo(true);
      } else {
        setEsMiPrestamo(false);
      }

      // console.log("Disponible (antes de conversión):", data.disponible);
      // console.log("Fecha devolución (cruda):", data.fecha_devolucion);

      if (
        data.fecha_devolucion &&
        !isNaN(new Date(data.fecha_devolucion)) &&
        Number(data.disponible) !== 1
      ) {
        const fechaDevolucion = new Date(data.fecha_devolucion + "T00:00:00");
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Normalizar fecha actual

        const diasRestantes = Math.ceil(
          (fechaDevolucion - hoy) / (1000 * 60 * 60 * 24)
        );

        if (diasRestantes <= 8 && diasRestantes > 0) {
          setMensajeDevolucion(
            "⚠️ La fecha de devolución está próxima: " + data.fecha_devolucion
          );
        } else if (diasRestantes <= 0) {
          setMensajeDevolucion(
            "⏳ ¡El plazo de devolución ha vencido! Se ha aplicado una sanción."
          );
          aplicarSancion(user.id, data.id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.id]); // Dependencias

  // Ejecutar fetchLibro al cargar el componente
  useEffect(() => {
    fetchLibro();
  }, [fetchLibro]);

  // 📌 Función para tomar prestado el libro
  const tomarPrestado = async ({ loanDate, returnDate, bookId }) => {
    try {
      const response = await fetch("http://localhost:5000/prestamos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario_id: user.id,
          libro_id: bookId,
          fecha_prestamo: loanDate, // Fecha ingresada en el formulario
          fecha_devolucion: returnDate, // Fecha de devolución ingresada
        }),
      });

      if (!response.ok) {
        throw new Error("Error al tomar el libro prestado");
      }

      alert("📚 Has tomado prestado el libro.");
      setLeedOpen(false); // Cierra el modal
      fetchLibro(); // 🔄 Actualiza los datos sin recargar la página
    } catch (error) {
      console.error("❌ Error al tomar prestado el libro:", error);
      alert("Hubo un problema al tomar el libro prestado.");
    }
  };

  // 📌 Función para devolver el libro
  const devolverLibro = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/devolver/${libro.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usuario_id: user.id,
            // motivo: "Retraso en devolución",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al devolver el libro");
      }

      alert("📚 El libro ha sido devuelto exitosamente.");
      window.location.reload(); // Recargar la página para actualizar el estado
    } catch (error) {
      console.error("❌ Error al devolver el libro:", error);
      alert("Hubo un problema al devolver el libro.");
    }
  };

  // 📌 Aplicar sanción al usuario
  const aplicarSancion = async (usuarioId, libroId) => {
    // console.log(usuarioId)
    // console.log(libroId)
    let motivo = "Retraso En La Devolucion Del Libro";
    try {
      const response = await fetch("http://localhost:5000/sanciones", {
        method: "POST",
        body: JSON.stringify({ usuarioId, libroId, motivo }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.mensaje);

      console.log("✅ Sanción aplicada:", data.mensaje);
    } catch (error) {
      console.error("❌ Error al aplicar sanción:", error.message);
    }
  };

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!libro) return <p>Libro no encontrado.</p>;

  return (
    <div className="books-information-container">
      <h2>Información del libro</h2>
      <div className="books-information">
        <section className="book-image">
          <img
            src={`http://localhost:5000${libro.imagen_url}`}
            alt={`Imagen de ${libro.titulo}`}
          />
        </section>
        <section className="book-actions-content">
          <article className="row row-one">
            <p>
              Titulo: <span>{libro.titulo || "No disponible"}.</span>
            </p>
            <p>
              Estado:{" "}
              <span>
                {libro.disponible == 1 ? "Disponible" : "No Disponible"}.
              </span>
            </p>
          </article>

          {/* 📌 Mensajes de advertencia */}
          {mensajeDevolucion && (
            <p className="text-warning">{mensajeDevolucion}</p>
          )}

          <article className="row row-two">
            <p>
              Género: <span>{libro.generos || "No disponible"}.</span>
            </p>
            <p>
              Autor: <span>{libro.autor || "No disponible"}.</span>
            </p>
          </article>
          <article className="row row-three">
            <p>
              Categoria: <span>{libro.categoria || "No disponible"}.</span>
            </p>
            <p>
              ID: <span>{libro.id || "No disponible"}.</span>
            </p>
          </article>
          <article className="row row-four">
            <p>
              Descripción: <span>{libro.descripcion || "No disponible"}.</span>
            </p>
          </article>
          <article className="row-buttons">
            {isAdmin && (
              <>
                <button
                  id="btn-delete"
                  className="btn btn-color"
                  onClick={() => setDeleteOpen(true)}
                >
                  Eliminar
                </button>
              </>
            )}
            <button className="btn btn-color">Exportar</button>
            {esMiPrestamo ? (
              <button className="btn btn-color" onClick={devolverLibro}>
                Devolver Libro
              </button>
            ) : (
              <button
                className="btn btn-color"
                onClick={() => setLeedOpen(true)}
                disabled={libro.disponible == 0}
              >
                Tomar Prestado
              </button>
            )}
          </article>
        </section>
      </div>
      {/* Modal para eliminar */}
      <DeleteBookModal
        isOpen={isDeleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => navigate("/nav/catalogo")}
        bookId={libro.id} // <-- Asegurar que se pase el ID correcto
        bookTitle={libro.titulo}
      />
      {/* Modal para tomar prestado */}
      <LeedBookModal
        isOpen={isLeedOpen}
        onClose={() => setLeedOpen(false)}
        onConfirm={tomarPrestado} // ✅ Pasamos la función corregida
        bookTitle={libro.titulo}
        bookId={libro.id}
      />
    </div>
  );
}

export default Books_information;
