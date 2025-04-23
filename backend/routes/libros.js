const express = require("express");
const upload = require("./multer"); // ⬅️ Importar multerConfig
const { dbRun, dbGet, dbAll } = require("../db");
const router = express.Router();

const BASE_URL = "http://localhost:5000"; // Ajusta esto según tu dominio

router.get("/", async (req, res) => {
  try {
    let libros = await dbAll(`
      SELECT 
        l.id, 
        l.titulo, 
        l.descripcion, 
        l.categoria, 
        l.imagen_url, 
        l.disponible,
        a.nombre AS autor,
        (
          SELECT STRING_AGG(g.nombre, ', ')
          FROM generos g
          JOIN libro_genero lg ON g.id = lg.genero_id
          WHERE lg.libro_id = l.id
        ) AS generos,
        (
        SELECT u.nombre || ' ' || u.apellidos
        FROM prestamos p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.libro_id = l.id 
        AND p.devuelto = false
        LIMIT 1
      ) AS prestado_a,
        (
          SELECT p.fecha_devolucion
          FROM prestamos p
          WHERE p.libro_id = l.id 
          AND p.devuelto = false
          LIMIT 1
        ) AS fecha_devolucion
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      GROUP BY l.id, a.nombre
      ORDER BY l.titulo
    `);

    // Formateamos los datos para el frontend
    libros = libros.map((libro) => ({
      ...libro,
      imagen_url: libro.imagen_url ? `${BASE_URL}${libro.imagen_url}` : null,
      estado: libro.disponible ? "Disponible" : "Prestado",
      prestado: !libro.disponible,
      prestado_a: libro.prestado_a || null,
      prestado_texto: libro.disponible ? null : 
        `Prestado a: ${libro.prestado_a} (Devuelve: ${new Date(libro.fecha_devolucion).toLocaleDateString()})`,
      generos: libro.generos || 'Sin género asignado'
    }));

    res.json(libros);
  } catch (error) {
    console.error("❌ Error al obtener libros:", error);
    res.status(500).json({ mensaje: "Error al obtener libros" });
  }
});

// 📌 Obtener un libro por su ID, incluyendo quién lo tiene prestado
router.get("/:id", async (req, res) => {
  try {
    const libroId = req.params.id;

    const libro = await dbGet(
      `SELECT 
          libros.id, 
          libros.titulo, 
          libros.descripcion, 
          libros.categoria, 
          libros.disponible, 
          libros.imagen_url, 
          autores.nombre AS autor,  -- ✅ Obtenemos el nombre del autor
          prestamos.usuario_id AS usuario_prestamo_id, 
          prestamos.fecha_prestamo, 
          prestamos.fecha_devolucion,
          GROUP_CONCAT(generos.nombre, ', ') AS generos -- ✅ Concatenamos los géneros en una sola columna
        FROM libros
        LEFT JOIN prestamos ON libros.id = prestamos.libro_id 
        LEFT JOIN autores ON libros.autor_id = autores.id  -- ✅ Corregimos el JOIN con autores
        LEFT JOIN libro_genero ON libros.id = libro_genero.libro_id
        LEFT JOIN generos ON libro_genero.genero_id = generos.id
        WHERE libros.id = ? 
        GROUP BY libros.id, prestamos.usuario_id, prestamos.fecha_prestamo, prestamos.fecha_devolucion
        ORDER BY prestamos.fecha_prestamo DESC 
        LIMIT 1`,
      [libroId]
    );

    // console.log("📚 Libro encontrado:", libro);

    if (!libro) {
      return res.status(404).json({ mensaje: "Libro no encontrado." });
    }

    res.json(libro);
  } catch (error) {
    console.error("❌ Error al obtener información del libro:", error);
    res.status(500).json({ mensaje: "Error al obtener libro." });
  }
});

router.post("/", upload.single("imagen"), async (req, res) => {
  try {
    const { titulo, autor_id, descripcion, categoria, genero_id } = req.body;

    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    // 🔹 Insertar el libro en la base de datos
    await dbRun(
      "INSERT INTO libros (titulo, autor_id, descripcion, categoria, imagen_url) VALUES (?, ?, ?, ?, ?)",
      [titulo, autor_id, descripcion, categoria, imagen_url]
    );

    // 🔹 Obtener el último libro insertado
    const newBook = await dbGet(
      "SELECT * FROM libros ORDER BY id DESC LIMIT 1"
    );

    // 🔹 Asignar género al libro si `genero_id` está presente
    if (genero_id) {
      await dbRun(
        "INSERT INTO libro_genero (libro_id, genero_id) VALUES (?, ?)",
        [newBook.id, genero_id]
      );
    }

    res.status(201).json(newBook);
  } catch (error) {
    console.error("❌ Error al agregar libro:", error);
    res.status(500).json({ mensaje: "Error al agregar libro" });
  }
});

router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  const adminKey = req.headers['admin-key'];

  // 1. Validar clave de administrador
  if (adminKey !== "ADMIN_DELETE") {
    return res.status(403).json({ 
      success: false,
      message: "Acceso no autorizado. Clave de administrador requerida." 
    });
  }

  // 2. Validar que el ID es un número válido
  if (isNaN(id)) {
    return res.status(400).json({ 
      success: false,
      message: "ID de libro no válido" 
    });
  }

  try {
    // Iniciar transacción para operaciones atómicas
    await dbRun('BEGIN TRANSACTION');

    // 3. Verificar si el libro existe
    const libroExistente = await dbGet(
      'SELECT id FROM libros WHERE id = ?', 
      [id]
    );

    if (!libroExistente) {
      await dbRun('ROLLBACK');
      return res.status(404).json({ 
        success: false,
        message: "Libro no encontrado" 
      });
    }

    // 4. Eliminar relaciones en orden correcto (usando transacción)
    await dbRun('DELETE FROM libro_genero WHERE libro_id = ?', [id]);
    await dbRun('DELETE FROM prestamos WHERE libro_id = ?', [id]);
    await dbRun('DELETE FROM lecturas WHERE libro_id = ?', [id]);
    
    // 5. Eliminar el libro
    await dbRun('DELETE FROM libros WHERE id = ?', [id]);

    // Confirmar transacción
    await dbRun('COMMIT');

    // 6. Respuesta exitosa
    res.json({ 
      success: true,
      message: "Libro eliminado correctamente",
      deletedId: id 
    });

  } catch (error) {
    // Revertir transacción en caso de error
    await dbRun('ROLLBACK');
    
    console.error("Error eliminando libro:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al eliminar el libro",
      error: error.message 
    });
  }
});

module.exports = router;
