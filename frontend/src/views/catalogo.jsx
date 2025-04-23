import { useEffect, useState } from "react";
import Cards_books from "../components/cards/cards_books";

function Catalogo() {
  const [libros, setLibros] = useState([]);
  const [filteredLibros, setFilteredLibros] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Cargar libros iniciales
  useEffect(() => {
    const fetchLibros = async () => {
      try {
        const response = await fetch("http://localhost:5000/libros");
        const data = await response.json();
        setLibros(data);
        setFilteredLibros(data);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchLibros();
  }, []);

  // Búsqueda en API
  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (term.trim() === "") {
      setFilteredLibros(libros);
      
      setIsSearching(false);
      return;
    }
  
    setIsSearching(true);
    try {
      const response = await fetch(
        `http://localhost:5000/buscar?termino=${encodeURIComponent(term)}`
      );
      const data = await response.json();
      
      // Normalizar estructura de libros
      const librosNormalizados = data.map(libro => ({
        ...libro,
        // Asegurar que siempre haya una URL de imagen válida
        imagen_url: libro.imagen_url 
          ? `http://localhost:5000${libro.imagen_url}` // Asumiendo rutas relativas
          : '/images/libro-default.jpg' // Imagen por defecto
      }));
      
      setFilteredLibros(librosNormalizados);
    } catch (error) {
      console.error("Error buscando libros:", error);
      setFilteredLibros([]);
    } finally {
      setIsSearching(false);
    }
  };

  const librosPorGenero = (genero) =>
    libros.filter((libro) => libro.generos.includes(genero));

  // Componente para mostrar la información de préstamo
  const PrestamoInfo = ({ libro }) => (
    <div className="prestamo-info">
      <div className="prestamo-badge">PRESTADO</div>
      <div className="prestamo-details">
        <p>A: {libro.prestado_a}</p>
        <p>Devuelve: {new Date(libro.fecha_devolucion).toLocaleDateString()}</p>
      </div>
    </div>
  );

  return (
    <div className="views view-catalogo">
      <h2>Catálogo</h2>
      
      {/* Barra de búsqueda */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar por título, autor o género..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Mostrar resultados de búsqueda si hay término de búsqueda */}
      {searchTerm.trim() !== "" && (
        <div className="search-results">
          <h3>Resultados de búsqueda</h3>
          <div className="row-cards">
            {filteredLibros.length > 0 ? (
              filteredLibros.map((libro) => (
                <div key={libro.id} className="libro-container">
                  <Cards_books book={libro} />
                  {libro.prestado && <PrestamoInfo libro={libro} />}
                </div>
              ))
            ) : (
              <p>No se encontraron libros que coincidan con la búsqueda.</p>
            )}
          </div>
        </div>
      )}

      {/* Mapeo dinámico de géneros (solo si no hay búsqueda activa) */}
      {searchTerm.trim() === "" && ['Narrativa', 'Tragedia', 'Terror', 'Fantasia', 'Aventuras', 'Ciencia ficción'].map((genero) => {
        const librosDelGenero = librosPorGenero(genero);
        if (librosDelGenero.length === 0) return null;
        
        return (
          <div key={genero} className="content-catalogo">
            <section className="title-genero">
              <h3>{genero}</h3>
            </section>
            <section className="row-cards">
              {librosDelGenero.map((libro) => (
                <div key={libro.id} className="libro-container">
                  <Cards_books book={libro} />
                  {libro.prestado && <PrestamoInfo libro={libro} />}
                </div>
              ))}
            </section>
          </div>
        );
      })}
    </div>
  );
}

export default Catalogo;