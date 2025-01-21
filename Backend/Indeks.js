const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");

const app = express();
const port = 4444;

app.use(
  cors({
    origin: "http://localhost:9000",
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

function verifyToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "Token is required!" });
  }

  jwt.verify(token, "tajni_kljuc", (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    req.user = decoded;
    next();
  });
}

app.post("/api/register", (req, res) => {
  const { ime, prezime, email, lozinka } = req.body;

  if (!ime || !prezime || !email || !lozinka) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  const uloga = "korisnik";

  const query = `
    INSERT INTO KorisniciTrening (ime, prezime, email, lozinka, uloga)
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

app.post("/api/login", (req, res) => {
  const { email, lozinka } = req.body;

  if (!email || !lozinka) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  const query = "SELECT * FROM KorisniciTrening WHERE email = ?";
  connection.query(query, [email], (error, results) => {
    if (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error." });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = results[0];

    if (user.lozinka !== lozinka) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      "tajni_kljuc",
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({ message: "Login successful!", token });
  });
});

app.get("/api/vjezbe", (req, res) => {
  const query = "SELECT * FROM Vjezbe";
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching exercises:", err);
      return res.status(500).json({ message: "Error fetching exercises" });
    }
    res.status(200).json(results);
  });
});

app.post("/api/admin/login", (req, res) => {
  const { ime, prezime, lozinka } = req.body;

  const query = "SELECT * FROM Treneri WHERE ime = ? AND prezime = ?";

  connection.query(query, [ime, prezime], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Greška pri izvršavanju upita" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Korisnik nije pronađen" });
    }

    const user = results[0];
    if (user.lozinka !== lozinka) {
      return res.status(401).json({ message: "Pogrešna lozinka" });
    }

    res.json({
      message: "Uspješna prijava",
    });
  });
});
app.post("/api/reviews", (req, res) => {
  const { name, review } = req.body;

  if (!name || !review) {
    return res.status(400).json({ message: "Ime i recenzija su obavezna." });
  }

  const query = "INSERT INTO RecenzijeTrening (name, review) VALUES (?, ?)";

  connection.query(query, [name, review], (err, result) => {
    if (err) {
      console.error("Greska pri unosu recenzije:", err);
      return res
        .status(500)
        .json({ message: "Došlo je do pogreške pri unosu." });
    }
    res.status(200).json({ message: "Recenzija uspješno pohranjena." });
  });
});
app.get("/api/users", async (req, res) => {
  const query = "SELECT * FROM KorisniciTrening";
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching exercises:", err);
      return res.status(500).json({ message: "Error fetching exercises" });
    }
    res.status(200).json(results);
  });
});
app.post("/api/dodajVjezbu", (req, res) => {
  const { naziv, opis, kategorija } = req.body;

  if (!naziv || !opis || !kategorija) {
    return res.status(400).json({ message: "Svi podaci su obavezni." });
  }

  const query = "INSERT INTO Vjezbe (naziv, opis, kategorija) VALUES (?, ?, ?)";

  connection.query(query, [naziv, opis, kategorija], (err, result) => {
    if (err) {
      console.error("Greška pri unosu vježbe:", err);
      return res.status(500).json({ message: "Došlo je do pogreške." });
    }

    return res.status(201).json({ message: "Vježba uspješno dodana!" });
  });
});
app.get("/api/treneri", (req, res) => {
  const query = "SELECT ime, prezime FROM Treneri";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Greška pri dohvaćanju podataka:", err);
      res.status(500).send("Greška pri dohvaćanju podataka");
      return;
    }
    res.json(results);
  });
});
app.post("/api/trening-planovi", async (req, res) => {
  const { naziv, opis, vjezbe } = req.body;

  if (!naziv || !opis || !vjezbe || !Array.isArray(vjezbe)) {
    return res.status(400).json({ message: "Svi podaci su obavezni!" });
  }

  try {
    connection.query(
      "INSERT INTO TreningPlanovi (naziv, opis) VALUES (?, ?)",
      [naziv, opis],
      (error, results) => {
        if (error) {
          console.error("Greška pri kreiranju plana:", error);
          return res
            .status(500)
            .json({ message: "Došlo je do greške pri kreiranju plana." });
        }

        const planId = results.insertId;

        const planVjezbeData = vjezbe.map((vjezba_id) => [planId, vjezba_id]);

        connection.query(
          "INSERT INTO PlanVjezbe (plan_id, vjezba_id) VALUES ?",
          [planVjezbeData],
          (error, results) => {
            if (error) {
              console.error("Greška pri dodavanju vježbi:", error);
              return res
                .status(500)
                .json({ message: "Došlo je do greške pri dodavanju vježbi." });
            }

            res.status(201).json({ message: "Trening plan kreiran!", planId });
          }
        );
      }
    );
  } catch (error) {
    console.error("Greška pri kreiranju trening plana:", error);
    res.status(500).json({ message: "Došlo je do greške." });
  }
});
app.get("/api/trening-planovi", (req, res) => {
  const query = `
    SELECT tp.id AS plan_id, tp.naziv AS plan_naziv, tp.opis AS plan_opis, 
           v.id AS vjezba_id, v.naziv AS vjezba_naziv
    FROM TreningPlanovi tp
    LEFT JOIN PlanVjezbe pv ON tp.id = pv.plan_id
    LEFT JOIN Vjezbe v ON pv.vjezba_id = v.id;
  `;

  connection.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Pogreška u upitu" });
    }

    const treningPlanovi = results.reduce((acc, row) => {
      let plan = acc.find((plan) => plan.plan_id === row.plan_id);

      if (!plan) {
        plan = {
          plan_id: row.plan_id,
          naziv: row.plan_naziv,
          opis: row.plan_opis,
          vjezbe: [],
        };
        acc.push(plan);
      }

      if (row.vjezba_id) {
        plan.vjezbe.push({
          id: row.vjezba_id,
          naziv: row.vjezba_naziv,
        });
      }

      return acc;
    }, []);

    res.json(treningPlanovi);
  });
});

app.get("/api/vjezbe", (req, res) => {
  const query = "SELECT * FROM Vjezbe";
  connection.query(query, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Greška pri dohvaćanju vježbi.", error: err });
    }
    res.json(results);
  });
});

app.listen(port, () => {
  console.log("Server running at port: " + port);
});
