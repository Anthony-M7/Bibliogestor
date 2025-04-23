const express = require("express");
const cors = require("cors"); // 👈 Importar cors
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const { dbRun, dbAll, dbGet } = require("./db");
require("dotenv").config();

const app = express();

// Configuración específica para CORS
const corsOptions = {
  origin: 'http://localhost:5173', // DEBE ser exactamente tu origen frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Admin-Key'],
  credentials: true // Solo si realmente necesitas enviar cookies
};

app.use(cors(corsOptions));

// Manejo explícito de OPTIONS
app.options('*', cors(corsOptions));
app.use(express.json());

// 📌 Servir la carpeta 'uploads' de manera estática
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET no está definido en .env");
  process.exit(1);
}

// ✅ Registro de usuario (POST)
app.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      birthDate,
      securityQuestion,
      securityAnswer,
      gender,
      cedula,
    } = req.body;

    // Validar si el email ya existe
    const existeUsuario = await dbGet(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );
    if (existeUsuario) {
      return res.status(400).json({ mensaje: "El correo ya está registrado" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario en la base de datos
    await dbRun(
      `INSERT INTO usuarios 
      (nombre, apellidos, email, contrasena, fecha_nacimiento, pregunta_seguridad, respuesta_seguridad, genero, cedula) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        lastName,
        email,
        hashedPassword,
        birthDate,
        securityQuestion,
        securityAnswer,
        gender,
        cedula,
      ]
    );

    res.status(201).json({ mensaje: "Usuario creado exitosamente" });
  } catch (error) {
    console.error("❌ Error al registrar el usuario:", error);
    res.status(500).json({ mensaje: "Error al registrar el usuario" });
  }
});

// ✅ Login de usuario (POST)
app.post("/login", async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    // Buscar usuario por email
    const usuario = await dbGet("SELECT * FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (!usuario) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }

    // Verificar contraseña
    const esValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!esValida) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }

    // Generar Token JWT
    const token = jwt.sign({ id: usuario.id, email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ mensaje: "Login exitoso", token, usuario });
  } catch (error) {
    console.error("❌ Error en el login:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

// Obtener totales
app.get("/totales", async (req, res) => {
  try {
    const libros = await dbGet("SELECT COUNT(*) AS count FROM libros");
    const usuarios = await dbGet("SELECT COUNT(*) AS count FROM usuarios");
    const admins = await dbGet(
      "SELECT COUNT(*) AS count FROM usuarios WHERE email = ?",
      ["admin123@gmail.com"]
    );

    res.json({
      totalLibros: libros.count,
      totalUsuarios: usuarios.count,
      totalAdmins: admins.count,
    });
  } catch (error) {
    console.error("❌ Error al obtener los totales:", error);
    res.status(500).json({ mensaje: "Error al obtener los totales" });
  }
});

// ✅ Verificar email
app.post("/verificar-email", async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await dbGet(
      "SELECT pregunta_seguridad FROM usuarios WHERE email = ?",
      [email]
    );
    if (!usuario) {
      return res.status(404).json({ mensaje: "El usuario no existe" });
    }
    res.json({ preguntaSeguridad: usuario.pregunta_seguridad });
  } catch (error) {
    console.error("❌ Error al verificar email:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

// ✅ Cambiar contraseña
app.post("/cambiar-contrasena", async (req, res) => {
  try {
    const { email, respuestaSeguridad, nuevaContrasena } = req.body;
    const usuario = await dbGet(
      "SELECT respuesta_seguridad FROM usuarios WHERE email = ?",
      [email]
    );
    if (!usuario) {
      return res.status(404).json({ mensaje: "El usuario no existe" });
    }
    if (usuario.respuesta_seguridad !== respuestaSeguridad) {
      return res
        .status(401)
        .json({ mensaje: "Respuesta de seguridad incorrecta" });
    }
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
    await dbRun("UPDATE usuarios SET contrasena = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);
    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error al cambiar la contraseña:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

// Obtener géneros
app.get("/generos", async (req, res) => {
  try {
    const generos = await dbAll("SELECT * FROM generos ORDER BY id");
    res.json(generos);
  } catch (error) {
    console.error("❌ Error al obtener los géneros:", error);
    res.status(500).json({ mensaje: "Error al obtener los géneros" });
  }
});

// 📌 Importar rutas
const librosRoutes = require("./routes/libros");
const autoresRoutes = require("./routes/autores");
const prestamosRoutes = require("./routes/prestamos");

// 📌 Usar las rutas importadas
app.use("/libros", librosRoutes);
app.use("/autores", autoresRoutes);
app.use("/prestamos", prestamosRoutes);

app.post("/sanciones", async (req, res) => {
  try {
    const { usuarioId, libroId, motivo } = req.body;

    if (!usuarioId || !libroId || !motivo) {
      return res
        .status(400)
        .json({ mensaje: "Faltan datos (usuario_id, libro_id o motivo)." });
    }

    // 🔹 Verificar si el préstamo aún no ha sido devuelto
    const prestamo = await dbGet(
      `SELECT * FROM prestamos 
       WHERE usuario_id = ? 
       AND libro_id = ? 
       AND devuelto = FALSE`,
      [usuarioId, libroId]
    );

    if (!prestamo) {
      return res.status(400).json({
        mensaje: "No se puede aplicar sanción: el libro ya fue devuelto.",
      });
    }

    // 🔍 **Verificar si ya existe una sanción activa para este usuario y libro**
    const sancionExistente = await dbGet(
      `SELECT * FROM sanciones 
       WHERE usuario_id = ? 
       AND libro_id = ? 
       AND fecha = CURRENT_DATE`, // ⏳ Evita sanciones repetidas en el mismo día
      [usuarioId, libroId]
    );

    if (sancionExistente) {
      console.warn("⚠️ Ya se aplicó una sanción hoy por este préstamo.");
      return res.status(400).json({
        mensaje: "⚠️ Ya se aplicó una sanción hoy por este préstamo.",
      });
    }

    // ✅ Registrar la sanción en la base de datos
    await dbRun(
      `INSERT INTO sanciones (usuario_id, libro_id, fecha, motivo) 
       VALUES (?, ?, CURRENT_DATE, ?)`,
      [usuarioId, libroId, motivo]
    );

    // ✅ Incrementar el número de sanciones del usuario
    await dbRun(
      `UPDATE usuarios 
       SET sanciones = sanciones + 1 
       WHERE id = ?`,
      [usuarioId]
    );

    res.json({ mensaje: "🚨 Sanción aplicada correctamente." });
  } catch (error) {
    console.error("❌ Error al aplicar sanción:", error);
    res.status(500).json({ mensaje: "Error al aplicar sanción." });
  }
});

app.post("/devolver/:id", async (req, res) => {
  try {
    const libroId = req.params.id;
    const { usuario_id } = req.body; // Se obtiene el usuario desde la solicitud

    if (!libroId || !usuario_id) {
      return res
        .status(400)
        .json({ mensaje: "Se requiere el ID del libro y el usuario." });
    }

    // 🔹 Verificar si el libro existe
    const libro = await dbGet(`SELECT * FROM libros WHERE id = ?`, [libroId]);
    if (!libro) {
      return res.status(404).json({ mensaje: "El libro no existe." });
    }

    // 🔹 Verificar si el usuario tiene este libro prestado actualmente
    const prestamo = await dbGet(
      `SELECT * FROM prestamos 
       WHERE libro_id = ? 
       AND usuario_id = ?  
       AND devuelto = FALSE`,
      [libroId, usuario_id]
    );

    if (!prestamo) {
      return res.status(400).json({
        mensaje: "No tienes este libro prestado o ya ha sido devuelto.",
      });
    }

    // 🔹 Marcar el préstamo como devuelto
    await dbRun(
      `UPDATE prestamos 
       SET fecha_devolucion = DATE('now'), devuelto = TRUE 
       WHERE libro_id = ? AND usuario_id = ?`,
      [libroId, usuario_id]
    );

    // 🔹 Hacer que el libro vuelva a estar disponible
    await dbRun(`UPDATE libros SET disponible = 1 WHERE id = ?`, [libroId]);

    // 🔹 Registrar en la tabla 'lecturas' si aún no está registrado
    await dbRun(
      `INSERT INTO lecturas (usuario_id, libro_id) 
       VALUES (?, ?) 
       ON CONFLICT(usuario_id, libro_id) DO NOTHING`,
      [usuario_id, libroId]
    );

    res.json({
      mensaje: "📚 Libro devuelto y marcado como leído exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al devolver libro:", error);
    res
      .status(500)
      .json({ mensaje: "Error al procesar la devolución del libro." });
  }
});

app.get("/usuarios", async (req, res) => {
  try {
    const usuarios = await dbAll("SELECT * FROM usuarios ORDER BY id ASC"); // ⬅ Cambia dbGet por dbAll
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ mensaje: "Error al obtener usuarios" });
  }
});

app.put('/editar_usuario/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombres,
    apellidos,
    cedula,
    genero,
    correo,
    fechaNacimiento,
    password,
    pregunta_seguridad,
    respuesta_seguridad
  } = req.body;

  // 1. Validar que el ID es numérico
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "ID de usuario no válido"
    });
  }

  // 2. Validar campos obligatorios
  if (!nombres || !apellidos || !cedula || !genero || !correo || !fechaNacimiento) {
    return res.status(400).json({
      success: false,
      message: "Faltan campos obligatorios"
    });
  }

  try {
    // 3. Verificar si el usuario existe
    const usuarioExistente = await dbGet(
      'SELECT id FROM usuarios WHERE id = ?',
      [id]
    );

    if (!usuarioExistente) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    // 4. Verificar si el email ya está en uso por otro usuario
    const emailEnUso = await dbGet(
      'SELECT id FROM usuarios WHERE email = ? AND id != ?',
      [correo, id]
    );

    if (emailEnUso) {
      return res.status(400).json({
        success: false,
        message: "El correo electrónico ya está en uso por otro usuario"
      });
    }

    // 5. Verificar si la cédula ya está en uso por otro usuario
    const cedulaEnUso = await dbGet(
      'SELECT id FROM usuarios WHERE cedula = ? AND id != ?',
      [cedula, id]
    );

    if (cedulaEnUso) {
      return res.status(400).json({
        success: false,
        message: "La cédula ya está en uso por otro usuario"
      });
    }

    // 6. Preparar los datos para actualizar
    let updateData = {
      nombre: nombres,
      apellidos,
      cedula,
      genero,
      email: correo,
      fecha_nacimiento: fechaNacimiento,
      pregunta_seguridad,
      respuesta_seguridad
    };

    // 7. Si se proporcionó contraseña, hashearla
    if (password) {
      const saltRounds = 10;
      updateData.contrasena = await bcrypt.hash(password, saltRounds);
    }

    // 8. Construir la consulta SQL dinámicamente
    const setClause = Object.keys(updateData)
      .filter(key => updateData[key] !== undefined)
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.values(updateData)
      .filter(value => value !== undefined);

    // 9. Ejecutar la actualización
    await dbRun(
      `UPDATE usuarios SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    // 10. Respuesta exitosa
    res.json({
      success: true,
      message: "Usuario actualizado correctamente",
      usuario: {
        id,
        ...updateData
      }
    });

  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el usuario",
      error: error.message
    });
  }
});

app.get("/perfil/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // 🔹 Consulta principal del usuario
    const userResult = await dbGet("SELECT * FROM usuarios WHERE id = ?", [
      userId,
    ]);

    if (!userResult) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // 🔹 Contar libros prestados
    const prestamosResult = await dbGet(
      "SELECT COUNT(*) as librosPrestados FROM prestamos WHERE usuario_id = ? AND devuelto = FALSE",
      [userId]
    );

    // 🔹 Contar libros leídos
    const librosLeidosResult = await dbGet(
      "SELECT COUNT(*) as librosLeidos FROM lecturas WHERE usuario_id = ?",
      [userId]
    );

    // 🔹 Construir la respuesta
    const userData = {
      ...userResult,
      librosPrestados: prestamosResult ? prestamosResult.librosPrestados : 0,
      librosLeidos: librosLeidosResult ? librosLeidosResult.librosLeidos : 0,
    };

    res.json(userData);
  } catch (error) {
    console.error("❌ Error al obtener perfil:", error);
    res.status(500).json({ mensaje: "Error al obtener perfil" });
  }
});

app.put("/libros/:id", async (req, res) => {
  const { id } = req.params;
  const { titulo, autor_id, descripcion, categoria, disponible, imagen_url } =
    req.body;

  try {
    await db.run(
      `UPDATE libros SET titulo = ?, autor_id = ?, descripcion = ?, categoria = ?, disponible = ?, imagen_url = ?
       WHERE id = ?`,
      [titulo, autor_id, descripcion, categoria, disponible, imagen_url, id]
    );

    res.json({ mensaje: "Libro actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar libro:", error);
    res.status(500).json({ mensaje: "Error al actualizar libro" });
  }
});

app.get("/lecturas/:usuario_id", async (req, res) => {
  try {
    const { usuario_id } = req.params;

    // 🔍 Obtener los libros leídos por el usuario
    const librosLeidos = await dbAll(
      `SELECT libros.* FROM lecturas 
       JOIN libros ON lecturas.libro_id = libros.id
       WHERE lecturas.usuario_id = ?`,
      [usuario_id]
    );

    res.json(librosLeidos);
  } catch (error) {
    console.error("❌ Error al obtener libros leídos:", error);
    res.status(500).json({ mensaje: "Error al obtener los libros leídos." });
  }
});

app.get("/estadisticas", async (req, res) => {
  try {
    // Contar el total de libros
    const totalLibrosResult = await dbGet(
      "SELECT COUNT(*) as total FROM libros"
    );
    const totalLibros = totalLibrosResult.total || 0;

    // Contar los libros prestados (devuelto = false)
    const librosPrestadosResult = await dbGet(
      "SELECT COUNT(*) as prestados FROM prestamos WHERE devuelto = FALSE"
    );
    const librosPrestados = librosPrestadosResult.prestados || 0;

    // Libros disponibles (totales - prestados)
    const librosDisponibles = totalLibros - librosPrestados;

    res.json({
      totalLibros,
      librosPrestados,
      librosDisponibles,
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({ mensaje: "Error obteniendo estadísticas" });
  }
});

app.get("/usuarios_estadisticas", async (req, res) => {
  try {
    const query = `
      SELECT 
      (SELECT COUNT(*) FROM usuarios WHERE bloqueado = 1) AS bloqueados,
      (SELECT COUNT(*) FROM usuarios WHERE email = 'admin123@gmail.com') AS administradores,
      (SELECT COUNT(*) FROM usuarios WHERE bloqueado = 0 AND email <> 'admin123@gmail.com') AS activos
    `;

    const result = await dbGet(query); // Usamos dbGet para obtener UNA SOLA fila
    // console.log("📊 Estadísticas:", result);
    res.json(result);
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Ruta para eliminar usuario
app.delete("/usuarios/:id", async (req, res) => {
  const { id } = req.params;  // Obtener el ID del usuario desde la URL

  try {
    // Verificar si el usuario existe
    const user = await dbGet("SELECT * FROM usuarios WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Eliminar usuario
    await dbRun("DELETE FROM usuarios WHERE id = ?", [id]);

    res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("❌ Error al eliminar el usuario:", error.message);
    res.status(500).json({ message: "Error al eliminar el usuario", error: error.message });
  }
});

app.get('/buscar', async (req, res) => {
  const { termino } = req.query;
  
  if (!termino || termino.trim() === '') {
    return res.status(400).json({ error: 'Proporcione un término de búsqueda' });
  }

  try {
    const searchTerm = `%${termino.trim()}%`;
    
    const query = `
      SELECT 
        l.*,
        a.nombre as autor_nombre,
        u.nombre || ' ' || u.apellidos as prestado_a,  -- Concatenar nombre y apellidos
        p.fecha_devolucion,
        CASE WHEN p.id IS NOT NULL THEN true ELSE false END as prestado,
        (
          SELECT GROUP_CONCAT(g.nombre, ', ')
          FROM generos g
          JOIN libro_genero lg ON g.id = lg.genero_id
          WHERE lg.libro_id = l.id
        ) as generos
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      LEFT JOIN prestamos p ON l.id = p.libro_id AND p.devuelto = false
      LEFT JOIN usuarios u ON p.usuario_id = u.id  -- JOIN con la tabla usuarios
      LEFT JOIN libro_genero lg ON l.id = lg.libro_id
      LEFT JOIN generos g ON lg.genero_id = g.id
      WHERE l.titulo LIKE ? OR a.nombre LIKE ? OR g.nombre LIKE ?
      GROUP BY l.id
    `;
    
    const resultados = await dbAll(query, [searchTerm, searchTerm, searchTerm]);
    
    // Formatear la respuesta
    const resultadosFormateados = resultados.map(libro => ({
      id: libro.id,
      titulo: libro.titulo,
      autor: {
        id: libro.autor_id,
        nombre: libro.autor_nombre
      },
      descripcion: libro.descripcion,
      categoria: libro.categoria,
      disponible: libro.disponible,
      imagen_url: libro.imagen_url || null,
      generos: libro.generos ? libro.generos.split(', ').filter(g => g) : [],
      prestado: libro.prestado || false,
      prestado_a: libro.prestado_a || null,  // Ahora contendrá el nombre completo
      fecha_devolucion: libro.fecha_devolucion || null,
      estado: libro.prestado ? "Prestado" : "Disponible"
    }));

    res.json(resultadosFormateados);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: 'Error al buscar libros' });
  }
});

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
