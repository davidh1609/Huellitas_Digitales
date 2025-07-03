const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const app = express();
// carpeta server-achivo index.js
// Middlewares
app.use(cors());
app.use(express.json());

// Configuración de multer (almacenamiento en memoria para imágenes)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const session = require('express-session');
app.use(session({
  secret: 'seccion',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
}))

// Conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'davidh',
  database: 'huellitasDigitales'
});

db.connect(err => {
  if (err) {
    console.error('Error de conexión MySQL:', err);
    return;
  }
  console.log('Conectado a MySQL');
});

const JWT_SECRET = 'tu_clave_secreta_super_segura'; // Cambia esto por una clave fuerte en producción

// =========================
// USUARIOS
// =========================

// Crear usuario
app.post('/crearUsuario', (req, res) => {
  const values = [
    req.body.Usuario.trim(),
    req.body.Password.trim(),
    req.body.Telefono.trim(),
    req.body.Email.trim(),
    req.body.DireccionUsuario.trim(),
    'usuario'
  ];

  const sql = 'INSERT INTO usuario (`NombreUsuario`, `Contraseña`, `TelefonoUsuario`, `Email`, `DireccionUsuario`, `Rol`) VALUES (?)';
  db.query(sql, [values], (err, data) => {
    if (err) {
      console.error('Error al insertar usuario:', err);
      return res.status(500).json('Error en el servidor');
    }
    return res.status(200).json({ message: 'Usuario registrado', data });
  });
});

// Login
app.post('/login', (req, res) => {
  const { Usuario, Password } = req.body;

  const sql = 'SELECT * FROM usuario WHERE (NombreUsuario = ? OR Email = ?) AND Contraseña = ?';
  db.query(sql, [Usuario.trim(), Usuario.trim(), Password.trim()], (err, data) => {
    if (err) {
      console.error('Error en el login:', err);
      return res.status(500).json({ status: 'error', message: 'Error del servidor' });
    }

    if (data.length > 0) {
      const usuario = {
        id: data[0].IDUsuario, // Agrega el IDUsuario
        nombre: data[0].NombreUsuario,
        rol: data[0].Rol
      };
      // Generar token JWT
      const token = jwt.sign({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }, JWT_SECRET, { expiresIn: '2h' });
      return res.status(200).json({ status: 'success', message: 'Login correcto', usuario, token });
    } else {
      return res.status(401).json({ status: 'fail', message: 'Credenciales inválidas' });
    }
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ status: 'error', message: 'No se pudo cerrar sesión' });
    res.clearCookie('connect.sid'); // nombre default cookie de sesión
    return res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
  });
});

// Obtener todos los usuarios
app.get('/usuarios', (req, res) => {
  const sql = 'SELECT IDUsuario, NombreUsuario, Rol FROM usuario';
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ status: 'error', message: 'Error al obtener los usuarios' });
    }
    return res.status(200).json(data);
  });
});

// Actualizar rol del usuario
app.put('/usuarios/:id', (req, res) => {
  const { rol } = req.body;
  const { id } = req.params;

  const sql = 'UPDATE usuario SET Rol = ? WHERE IDUsuario = ?';
  db.query(sql, [rol, id], (err, data) => {
    if (err) {
      console.error('Error al actualizar rol:', err);
      return res.status(500).json({ status: 'error', message: 'Error al actualizar el rol' });
    }
    return res.status(200).json({ status: 'success', message: 'Rol actualizado', data });
  });
});

// =========================
// CRUD ALIMENTOS
// =========================

// Obtener todos los alimentos
app.get('/alimentos', (req, res) => {
  const sql = 'SELECT * FROM alimento';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Crear alimento
app.post('/alimentos', (req, res) => {
  const { Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal } = req.body;
  const sql = `INSERT INTO alimento (Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal)
               VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ id: result.insertId });
  });
});

// Editar alimento
app.put('/alimentos/:id', (req, res) => {
  const { id } = req.params;
  const { Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal } = req.body;
  const sql = `
    UPDATE alimento SET Especie_Alimento = ?, CantidadAlimento = ?, NombreAlimento = ?, FechaVencimiento = ?, IDSucursal = ?
    WHERE IDAlimento = ?`;
  db.query(sql, [Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// Eliminar alimento
app.delete('/alimentos/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM alimento WHERE IDAlimento = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// =========================
// CRUD SUCURSALES
// =========================

// Obtener todas las sucursales
app.get('/sucursales', (req, res) => {
  const sql = 'SELECT * FROM sucursal';
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error al obtener sucursales:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    res.json(result);
  });
});

// Crear una sucursal
app.post('/sucursales', (req, res) => {
  const { DireccionSuc, TelefonoSuc, IDUsuario } = req.body;
  const sql = 'INSERT INTO sucursal (DireccionSuc, TelefonoSuc, IDUsuario) VALUES (?, ?, ?)';
  db.query(sql, [DireccionSuc, TelefonoSuc, IDUsuario], (err, result) => {
    if (err) {
      console.error('Error al crear sucursal:', err);
      return res.status(500).json({ error: 'Error al crear sucursal' });
    }
    res.status(200).json({ message: 'Sucursal creada correctamente', id: result.insertId });
  });
});

// Actualizar una sucursal
app.put('/sucursales/:id', (req, res) => {
  const { id } = req.params;
  const { DireccionSuc, TelefonoSuc, IDUsuario } = req.body;
  const sql = 'UPDATE sucursal SET DireccionSuc = ?, TelefonoSuc = ?, IDUsuario = ? WHERE IDSucursal = ?';
  db.query(sql, [DireccionSuc, TelefonoSuc, IDUsuario, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar sucursal:', err);
      return res.status(500).json({ error: 'Error al actualizar sucursal' });
    }
    res.status(200).json({ message: 'Sucursal actualizada correctamente' });
  });
});

// Eliminar una sucursal
app.delete('/sucursales/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM sucursal WHERE IDSucursal = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar sucursal:', err);
      return res.status(500).json({ error: 'Error al eliminar sucursal' });
    }
    res.status(200).json({ message: 'Sucursal eliminada correctamente' });
  });
});

// =========================
// CRUD MASCOTAS + Verificación
// =========================

// Obtener todos los animales
app.get('/animales', (req, res) => {
  const sql = `
    SELECT IDMascota, UbicacionMascota, FotoMascota, InformacionMascota,
           Edad, Genero, Especie, Raza, NombreMascota, IDSucursal, IDUsuario,
           estadoMascota, estadoVerificacion
    FROM animal
    WHERE estadoMascota != 'adoptado'
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al consultar animales:', err);
      return res.status(500).json({ error: 'Error al obtener animales' });
    }
    const animalesConImagen = results.map(animal => ({
      ...animal,
      FotoMascota: animal.FotoMascota ? animal.FotoMascota.toString('base64') : null
    }));
    res.json(animalesConImagen);
  });
});

// Crear un nuevo animal (solo admin)
app.post('/animales', upload.single('FotoMascota'), (req, res) => {
  const {
    UbicacionMascota,
    InformacionMascota,
    Edad,
    Genero,
    Especie,
    Raza,
    NombreMascota,
    IDSucursal
  } = req.body;
  const FotoMascota = req.file ? req.file.buffer : null;

  // Para admin siempre aprobado
  const estadoMascota = 'activo';
  const estadoVerificacion = 'aprobado';

  const query = `
    INSERT INTO animal 
      (UbicacionMascota, FotoMascota, InformacionMascota, Edad, Genero,
       Especie, Raza, NombreMascota, IDSucursal, estadoMascota, estadoVerificacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [
    UbicacionMascota, FotoMascota, InformacionMascota, Edad, Genero,
    Especie, Raza, NombreMascota, IDSucursal, estadoMascota, estadoVerificacion
  ], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear el animal' });
    res.json({ message: 'Animal creado correctamente', id: result.insertId });
  });
});


// ====================================
// 2) RUTAS DE SOLICITUD PARA USUARIO
// ====================================

// POST /animales/solicitud  ← USUARIO crea ficha (pendiente de verificación)
app.post(
  '/animales/solicitud',
  upload.single('FotoMascota'),
  (req, res) => {
    const {
      UbicacionMascota,
      InformacionMascota,
      Edad,
      Genero,
      Especie,
      Raza,
      NombreMascota,
      IDUsuario
    } = req.body;

    console.error('Datos recibidos solicitud:', req.body);

    const FotoMascota = req.file ? req.file.buffer : null;
    const estadoMascota = 'activo';
    const estadoVerificacion = 'pendiente';

    const sql = `
      INSERT INTO animal 
        (UbicacionMascota, FotoMascota, InformacionMascota, Edad, Genero,
         Especie, Raza, NombreMascota, IDUsuario,
         estadoMascota, estadoVerificacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [
      UbicacionMascota,
      FotoMascota,
      InformacionMascota,
      Edad,
      Genero,
      Especie,
      Raza,
      NombreMascota,
      IDUsuario,
      estadoMascota,
      estadoVerificacion
    ], (err, result) => {
      if (err) {
        console.error('Error al crear solicitud (usuario):', err);
        return res.status(500).json({ error: 'Error al crear solicitud' });
      }
      res.json({ message: 'Solicitud enviada', id: result.insertId });
    });
  }
);


// Actualizar un animal (campos generales o verificación)
app.put('/animales/:id', upload.single('FotoMascota'), (req, res) => {
  const { id } = req.params;
  const updates = [];
  const params = [];

  // Si viene estadoVerificacion en body, lo actualizamos
  if (req.body.estadoVerificacion) {
    updates.push('estadoVerificacion = ?');
    params.push(req.body.estadoVerificacion);
  }
  // De lo contrario actualizamos campos normales
  else {
    const {
      UbicacionMascota,
      InformacionMascota,
      Edad,
      Genero,
      Especie,
      Raza,
      NombreMascota,
      IDSucursal
    } = req.body;
    updates.push(
      'UbicacionMascota = ?', 'InformacionMascota = ?', 'Edad = ?',
      'Genero = ?', 'Especie = ?', 'Raza = ?', 'NombreMascota = ?', 'IDSucursal = ?'
    );
    params.push(
      UbicacionMascota, InformacionMascota, Edad,
      Genero, Especie, Raza, NombreMascota, IDSucursal
    );
    // Foto opcional
    if (req.file) {
      updates.push('FotoMascota = ?');
      params.push(req.file.buffer);
    }
  }

  // Construimos la consulta solo con los campos que llegan
  const query = `
    UPDATE animal
    SET ${updates.join(', ')}
    WHERE IDMascota = ?
  `;
  params.push(id);

  db.query(query, params, err => {
    if (err) {
      console.error('Error al actualizar el animal:', err);
      return res.status(500).json({ error: 'Error al actualizar el animal' });
    }
    res.json({ message: 'Animal actualizado correctamente' });
  });
});

// Eliminar un animal
app.delete('/animales/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM animal WHERE IDMascota = ?';
  db.query(query, [id], err => {
    if (err) {
      console.error('Error al eliminar el animal:', err);
      return res.status(500).json({ error: 'Error al eliminar el animal' });
    }
    res.json({ message: 'Animal eliminado correctamente' });
  });
});

// Obtener un animal por ID
app.get('/animales/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT IDMascota, UbicacionMascota, FotoMascota, InformacionMascota,
           Edad, Genero, Especie, Raza, NombreMascota, IDSucursal, IDUsuario,
           estadoMascota, estadoVerificacion
    FROM animal
    WHERE IDMascota = ?
  `;
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener el animal por ID:', err);
      return res.status(500).json({ error: 'Error al obtener el animal' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    const animal = results[0];
    animal.FotoMascota = animal.FotoMascota ? animal.FotoMascota.toString('base64') : null;
    res.json(animal);
  });
});



// =========================
// CRUD ADOPCIONES
// =========================

// Obtener todas las solicitudes de adopción
app.get('/gestionadopciones', (req, res) => {
  const sql = `
    SELECT a.IDAdopcion, u.NombreUsuario, an.NombreMascota, a.FechaAdopcion 
    FROM adopta a
    JOIN usuario u ON a.IDUsuario = u.IDUsuario
    JOIN animal an ON a.IDMascota = an.IDMascota 
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener adopciones:', err);
      return res.status(500).json({ error: 'Error al obtener adopciones' });
    }
    res.json(results);
  });
});

// Actualizar una solicitud de adopción
app.put('/gestionadopciones/:id', (req, res) => {
  const { id } = req.params;
  const { IDUsuario, IDAnimal, FechaSolicitud, EstadoSolicitud } = req.body;

  const sql = `
    UPDATE adopta
    SET IDUsuario = ?, IDAnimal = ?, FechaSolicitud = ?, EstadoSolicitud = ?
    WHERE IDAdopcion = ?
  `;
  db.query(sql, [IDUsuario, IDAnimal, FechaSolicitud, EstadoSolicitud, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar adopción:', err);
      return res.status(500).json({ error: 'Error al actualizar la adopción' });
    }
    res.status(200).json({ message: 'Adopción actualizada correctamente' });
  });
});

// Eliminar una solicitud de adopción
app.delete('/gestionadopciones/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM adopta WHERE IDAdopcion = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar adopción:', err);
      return res.status(500).json({ error: 'Error al eliminar la adopción' });
    }
    res.status(200).json({ message: 'Adopción eliminada correctamente' });
  });
});

// -------------------
// GESTIÓN DE SOLICITUDES
// -------------------

// 1) Obtener todas las solicitudes
app.get('/solicitudes', (req, res) => {
  const sql = 'SELECT * FROM solicitudes';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener solicitudes:', err);
      return res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
    res.json(results);
  });
});

// 0) Crear nueva solicitud de adopción
app.post('/solicitudes', (req, res) => {
  const { IDUsuario, IDMascota, FechaSolicitud } = req.body;
  const sql = 'INSERT INTO solicitudes (IDUsuario, IDMascota, FechaSolicitud) VALUES (?, ?, ?)';
  db.query(sql, [IDUsuario, IDMascota, FechaSolicitud], (err, result) => {
    if (err) {
      console.error('Error al crear solicitud:', err);
      return res.status(500).json({ error: 'Error al crear solicitud' });
    }
    res.status(201).json({ message: 'Solicitud creada correctamente', id: result.insertId });
  });
});

// 2) Eliminar solicitud (usado por “Eliminar”)
app.delete('/solicitudes/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM solicitudes WHERE IDSolicitud = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar solicitud:', err);
      return res.status(500).json({ error: 'Error al eliminar solicitud' });
    }
    res.status(200).json({ message: 'Solicitud eliminada correctamente' });
  });
});

// 3) Actualizar solicitud (flujo de “Rechazar” y “Aprobar” borra la solicitud)
// Actualizar estado de la solicitud (aprobado/rechazado)
app.put('/solicitudes/:id', (req, res) => {
  const { id } = req.params;
  const { EstadoSolicitud } = req.body;
  if (!EstadoSolicitud) {
    return res.status(400).json({ error: 'EstadoSolicitud requerido' });
  }
  const sql = 'UPDATE solicitudes SET EstadoSolicitud = ? WHERE IDSolicitud = ?';
  db.query(sql, [EstadoSolicitud, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar estado de solicitud:', err);
      return res.status(500).json({ error: 'Error al actualizar estado de solicitud' });
    }
    res.status(200).json({ message: 'Estado de solicitud actualizado correctamente' });
  });
});

// 4) Crear adopción (flujo de “Aprobar”)
app.post('/adopta', (req, res) => {
  const { IDUsuario, IDMascota, FechaAdopcion } = req.body;
  // Registrar la adopción
  const sql = 'INSERT INTO adopta (IDUsuario, IDMascota, FechaAdopcion) VALUES (?, ?, ?)';
  db.query(sql, [IDUsuario, IDMascota, FechaAdopcion], (err, result) => {
    if (err) {
      console.error('Error al insertar adopción:', err);
      return res.status(500).json({ error: 'Error al insertar adopción' });
    }
    // Marcar la mascota como adoptada
    const updateSql = 'UPDATE animal SET estadoMascota = ? WHERE IDMascota = ?';
    db.query(updateSql, ['adoptado', IDMascota], (updateErr) => {
      if (updateErr) {
        console.error('Error al actualizar estado de mascota:', updateErr);
        return res.status(500).json({ error: 'Adopción registrada pero error al actualizar estado de mascota' });
      }
      res.status(201).json({ message: 'Adopción registrada y mascota marcada como adoptada', id: result.insertId });
    });
  });
});

// Middleware para verificar token y rol de administrador
function verificarAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ status: 'fail', message: 'Token requerido' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ status: 'fail', message: 'Token inválido' });
    if (user.rol !== 'administrador') return res.status(403).json({ status: 'fail', message: 'Acceso denegado: solo administradores' });
    req.user = user;
    next();
  });
}

// Proteger rutas de administración
app.get('/gestionadopciones', verificarAdmin, (req, res) => {
  const sql = `
    SELECT a.IDAdopcion, u.NombreUsuario, an.NombreMascota, a.FechaAdopcion 
    FROM adopta a
    JOIN usuario u ON a.IDUsuario = u.IDUsuario
    JOIN animal an ON a.IDMascota = an.IDMascota 
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener adopciones:', err);
      return res.status(500).json({ error: 'Error al obtener adopciones' });
    }
    res.json(results);
  });
});

app.put('/gestionadopciones/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  const { IDUsuario, IDAnimal, FechaSolicitud, EstadoSolicitud } = req.body;

  const sql = `
    UPDATE adopta
    SET IDUsuario = ?, IDAnimal = ?, FechaSolicitud = ?, EstadoSolicitud = ?
    WHERE IDAdopcion = ?
  `;
  db.query(sql, [IDUsuario, IDAnimal, FechaSolicitud, EstadoSolicitud, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar adopción:', err);
      return res.status(500).json({ error: 'Error al actualizar la adopción' });
    }
    res.status(200).json({ message: 'Adopción actualizada correctamente' });
  });
});

app.delete('/gestionadopciones/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM adopta WHERE IDAdopcion = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar adopción:', err);
      return res.status(500).json({ error: 'Error al eliminar la adopción' });
    }
    res.status(200).json({ message: 'Adopción eliminada correctamente' });
  });
});

app.get('/alimentos', verificarAdmin, (req, res) => {
  const sql = 'SELECT * FROM alimento';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.post('/alimentos', verificarAdmin, (req, res) => {
  const { Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal } = req.body;
  const sql = `INSERT INTO alimento (Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal)
               VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ id: result.insertId });
  });
});

app.put('/alimentos/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  const { Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal } = req.body;
  const sql = `
    UPDATE alimento SET Especie_Alimento = ?, CantidadAlimento = ?, NombreAlimento = ?, FechaVencimiento = ?, IDSucursal = ?
    WHERE IDAlimento = ?`;
  db.query(sql, [Especie_Alimento, CantidadAlimento, NombreAlimento, FechaVencimiento, IDSucursal, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

app.delete('/alimentos/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM alimento WHERE IDAlimento = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

app.get('/solicitudes', verificarAdmin, (req, res) => {
  const sql = 'SELECT * FROM solicitudes';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener solicitudes:', err);
      return res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
    res.json(results);
  });
});

app.delete('/solicitudes/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM solicitudes WHERE IDSolicitud = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar solicitud:', err);
      return res.status(500).json({ error: 'Error al eliminar solicitud' });
    }
    res.status(200).json({ message: 'Solicitud eliminada correctamente' });
  });
});

app.put('/solicitudes/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  // Nota: el frontend ya habrá hecho POST /adopta en caso de "aprobar"
  const sql = 'DELETE FROM solicitudes WHERE IDSolicitud = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error al procesar solicitud:', err);
      return res.status(500).json({ error: 'Error al procesar solicitud' });
    }
    res.status(200).json({ message: 'Solicitud procesada correctamente' });
  });
});

app.get('/sucursales', verificarAdmin, (req, res) => {
  const sql = 'SELECT * FROM sucursal';
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error al obtener sucursales:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    res.json(result);
  });
});

app.post('/sucursales', verificarAdmin, (req, res) => {
  const { DireccionSuc, TelefonoSuc, IDUsuario } = req.body;
  const sql = 'INSERT INTO sucursal (DireccionSuc, TelefonoSuc, IDUsuario) VALUES (?, ?, ?)';
  db.query(sql, [DireccionSuc, TelefonoSuc, IDUsuario], (err, result) => {
    if (err) {
      console.error('Error al crear sucursal:', err);
      return res.status(500).json({ error: 'Error al crear sucursal' });
    }
    res.status(200).json({ message: 'Sucursal creada correctamente', id: result.insertId });
  });
});

app.put('/sucursales/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  const { DireccionSuc, TelefonoSuc, IDUsuario } = req.body;
  const sql = 'UPDATE sucursal SET DireccionSuc = ?, TelefonoSuc = ?, IDUsuario = ? WHERE IDSucursal = ?';
  db.query(sql, [DireccionSuc, TelefonoSuc, IDUsuario, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar sucursal:', err);
      return res.status(500).json({ error: 'Error al actualizar sucursal' });
    }
    res.status(200).json({ message: 'Sucursal actualizada correctamente' });
  });
});

app.delete('/sucursales/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM sucursal WHERE IDSucursal = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar sucursal:', err);
      return res.status(500).json({ error: 'Error al eliminar sucursal' });
    }
    res.status(200).json({ message: 'Sucursal eliminada correctamente' });
  });
});

app.get('/usuarios', verificarAdmin, (req, res) => {
  const sql = 'SELECT IDUsuario, NombreUsuario, Rol FROM usuario';
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ status: 'error', message: 'Error al obtener los usuarios' });
    }
    return res.status(200).json(data);
  });
});

app.put('/usuarios/:id', verificarAdmin, (req, res) => {
  const { rol } = req.body;
  const { id } = req.params;

  const sql = 'UPDATE usuario SET Rol = ? WHERE IDUsuario = ?';
  db.query(sql, [rol, id], (err, data) => {
    if (err) {
      console.error('Error al actualizar rol:', err);
      return res.status(500).json({ status: 'error', message: 'Error al actualizar el rol' });
    }
    return res.status(200).json({ status: 'success', message: 'Rol actualizado', data });
  });
});

app.post('/animales', verificarAdmin, upload.single('FotoMascota'), (req, res) => {
  const {
    UbicacionMascota,
    InformacionMascota,
    Edad,
    Genero,
    Especie,
    Raza,
    NombreMascota,
    IDSucursal
  } = req.body;
  const FotoMascota = req.file ? req.file.buffer : null;

  // Para admin siempre aprobado
  const estadoMascota = 'activo';
  const estadoVerificacion = 'aprobado';

  const query = `
    INSERT INTO animal 
      (UbicacionMascota, FotoMascota, InformacionMascota, Edad, Genero,
       Especie, Raza, NombreMascota, IDSucursal, estadoMascota, estadoVerificacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [
    UbicacionMascota, FotoMascota, InformacionMascota, Edad, Genero,
    Especie, Raza, NombreMascota, IDSucursal, estadoMascota, estadoVerificacion
  ], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear el animal' });
    res.json({ message: 'Animal creado correctamente', id: result.insertId });
  });
});

app.put('/animales/:id', verificarAdmin, upload.single('FotoMascota'), (req, res) => {
  const { id } = req.params;
  const updates = [];
  const params = [];

  // Si viene estadoVerificacion en body, lo actualizamos
  if (req.body.estadoVerificacion) {
    updates.push('estadoVerificacion = ?');
    params.push(req.body.estadoVerificacion);
  }
  // De lo contrario actualizamos campos normales
  else {
    const {
      UbicacionMascota,
      InformacionMascota,
      Edad,
      Genero,
      Especie,
      Raza,
      NombreMascota,
      IDSucursal
    } = req.body;
    updates.push(
      'UbicacionMascota = ?', 'InformacionMascota = ?', 'Edad = ?',
      'Genero = ?', 'Especie = ?', 'Raza = ?', 'NombreMascota = ?', 'IDSucursal = ?'
    );
    params.push(
      UbicacionMascota, InformacionMascota, Edad,
      Genero, Especie, Raza, NombreMascota, IDSucursal
    );
    // Foto opcional
    if (req.file) {
      updates.push('FotoMascota = ?');
      params.push(req.file.buffer);
    }
  }

  // Construimos la consulta solo con los campos que llegan
  const query = `
    UPDATE animal
    SET ${updates.join(', ')}
    WHERE IDMascota = ?
  `;
  params.push(id);

  db.query(query, params, err => {
    if (err) {
      console.error('Error al actualizar el animal:', err);
      return res.status(500).json({ error: 'Error al actualizar el animal' });
    }
    res.json({ message: 'Animal actualizado correctamente' });
  });
});

app.delete('/animales/:id', verificarAdmin, (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM animal WHERE IDMascota = ?';
  db.query(query, [id], err => {
    if (err) {
      console.error('Error al eliminar el animal:', err);
      return res.status(500).json({ error: 'Error al eliminar el animal' });
    }
    res.json({ message: 'Animal eliminado correctamente' });
  });
});

// =========================
// INICIAR SERVIDOR
// =========================
app.listen(3001, () => {
  console.log('Servidor escuchando en el puerto 3001');
});
