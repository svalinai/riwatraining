const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");

const app = express();
const port = 4444;

// Enable CORS for frontend-backend communication
app.use(
  cors({
    origin: "http://localhost:9000", // Ovo mora odgovarati portu na kojem frontend radi
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);

// Parse JSON request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MySQL database
const connection = mysql.createConnection({
  host: "student.veleri.hr",
  user: "isvalina",
  password: "11",
  database: "isvalina",
});

connection.connect(function (err) {
  if (err) {
    console.error("Failed to connect to the database:", err);
    return;
  }
  console.log("Connected to MySQL database!");
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "Token is required!" });
  }

  jwt.verify(token, "tajni_kljuc", (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    req.user = decoded; // Store user data in the request
    next();
  });
}

// Route for user registration
app.post("/api/register", (req, res) => {
  const { ime, prezime, email, lozinka, uloga } = req.body;

  // Provjera da li su svi podaci prisutni
  if (!ime || !prezime || !email || !lozinka || !uloga) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  // SQL upit za unos korisnika u bazu podataka
  const query = `
    INSERT INTO Korisnici (ime, prezime, email, lozinka, uloga)
    VALUES (?, ?, ?, ?, ?)
  `;
  const values = [ime, prezime, email, lozinka, uloga];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.error("Registration error:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Email already exists!" });
      }
      return res.status(500).json({ message: "Server error." });
    }
    res.status(201).json({ message: "User successfully registered!" });
  });
});

// Route for user login
// Route for user login
app.post("/api/login", (req, res) => {
  const { email, lozinka } = req.body;

  if (!email || !lozinka) {
    return res
      .status(400)
      .json({ message: "Email and password are required!" });
  }

  const query = "SELECT * FROM Korisnici WHERE email = ?";
  connection.query(query, [email], (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ message: "Invalid login credentials" });
    }

    const user = results[0];

    // Proveravamo da li unesena lozinka odgovara onoj u bazi (bez hashiranja)
    if (user.lozinka !== lozinka) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // Na osnovu uloge korisnika šaljemo odgovarajući layout
    let layout;
    if (user.uloga === "trener") {
      layout = "AdminLayout"; // Ako je uloga trener, vraćamo AdminLayout
    } else {
      layout = "MainLayout"; // Inače vraćamo MainLayout
    }

    // Ako su email i lozinka ispravni, vraća se poruka o uspešnoj prijavi i layout
    res.status(200).json({
      message: "Login successful",
      layout: layout, // Dodajemo layout u odgovor
    });
  });
});

// Example of a protected route

app.get("/api/vjezbe", (req, res) => {
  const query = "SELECT * FROM Vjezbe"; // SQL upit za dohvat svih vježbi
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching exercises:", err);
      return res.status(500).json({ message: "Error fetching exercises" });
    }
    res.status(200).json(results); // Vraćamo podatke u JSON formatu
  });
});

// Start the server
app.listen(port, () => {
  console.log("Server running at port: " + port);
});
