from datetime import datetime
from extensions import db


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 1 — Utilisateur
# ══════════════════════════════════════════════════════════════════════════════
class Utilisateur(db.Model):
    __tablename__ = 'utilisateur'
    id_utilisateur    = db.Column(db.Integer, primary_key=True)
    nom               = db.Column(db.String(100), nullable=False)
    prenom            = db.Column(db.String(100), nullable=False)
    email             = db.Column(db.String(150), unique=True, nullable=False)
    mot_de_passe_hash = db.Column(db.Text, nullable=False)
    contact           = db.Column(db.String(50), nullable=True)
    role              = db.Column(db.String(50), nullable=False)  # raf | comptable
    actif             = db.Column(db.Boolean, default=True)
    date_creation     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id_utilisateur,
            'nom':           self.nom,
            'prenom':        self.prenom,
            'email':         self.email,
            'contact':       self.contact or '',
            'role':          self.role,
            'actif':         self.actif,
            'date_creation': self.date_creation.strftime('%d/%m/%Y')
        }


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 2 — Etudiant
# ══════════════════════════════════════════════════════════════════════════════
class Etudiant(db.Model):
    __tablename__ = 'etudiant'
    id_etudiant       = db.Column(db.Integer, primary_key=True)
    matricule         = db.Column(db.String(50), unique=True, nullable=False)
    nom               = db.Column(db.String(100), nullable=False)
    prenom            = db.Column(db.String(100), nullable=False)
    email             = db.Column(db.String(150), unique=True, nullable=True)
    contact           = db.Column(db.String(50), nullable=True)
    classe            = db.Column(db.String(50), nullable=False)   # ex: L1, L2, L3
    filiere           = db.Column(db.String(100), nullable=True)   # ex: GLRS, CDSD
    annee_academique  = db.Column(db.String(20), nullable=False)   # ex: 2025-2026
    statut            = db.Column(db.String(20), default='actif')  # actif | archive
    date_inscription  = db.Column(db.DateTime, default=datetime.utcnow)

    # Relations
    paiements = db.relationship('Paiement', backref='etudiant', lazy=True,
                                 foreign_keys='Paiement.id_etudiant')

    def to_dict(self):
        return {
            'id':              self.id_etudiant,
            'matricule':       self.matricule,
            'nom':             self.nom,
            'prenom':          self.prenom,
            'email':           self.email or '',
            'contact':         self.contact or '',
            'classe':          self.classe,
            'filiere':         self.filiere or '',
            'annee_academique': self.annee_academique,
            'statut':          self.statut,
            'date_inscription': self.date_inscription.strftime('%d/%m/%Y')
        }


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 2 — Caisse
# ══════════════════════════════════════════════════════════════════════════════
class Caisse(db.Model):
    __tablename__ = 'caisse'
    id_caisse     = db.Column(db.Integer, primary_key=True)
    nom           = db.Column(db.String(100), nullable=False)
    description   = db.Column(db.Text, nullable=True)
    solde_actuel  = db.Column(db.Numeric(15, 2), default=0.00)
    type_caisse   = db.Column(db.String(50), nullable=False)   # principale | secondaire | projet
    statut        = db.Column(db.String(20), default='active') # active | inactive
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    # Relations
    paiements = db.relationship('Paiement', backref='caisse', lazy=True,
                                 foreign_keys='Paiement.id_caisse')
    depenses  = db.relationship('Depense', backref='caisse', lazy=True,
                                 foreign_keys='Depense.id_caisse')

    def to_dict(self):
        return {
            'id':           self.id_caisse,
            'nom':          self.nom,
            'description':  self.description or '',
            'solde_actuel': float(self.solde_actuel),
            'type_caisse':  self.type_caisse,
            'statut':       self.statut,
            'date_creation': self.date_creation.strftime('%d/%m/%Y')
        }


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 3 — Paiement (déclaré ici pour les FK)
# ══════════════════════════════════════════════════════════════════════════════
class Paiement(db.Model):
    __tablename__ = 'paiement'
    id_paiement   = db.Column(db.Integer, primary_key=True)
    id_etudiant   = db.Column(db.Integer, db.ForeignKey('etudiant.id_etudiant'), nullable=False)
    id_caisse     = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=False)
    montant       = db.Column(db.Numeric(15, 2), nullable=False)
    mode_paiement = db.Column(db.String(50), nullable=False)  # especes | virement | cheque | wave
    motif         = db.Column(db.String(200), nullable=True)
    reference     = db.Column(db.String(100), nullable=True)
    date_paiement = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id_paiement,
            'id_etudiant':   self.id_etudiant,
            'etudiant':      f"{self.etudiant.prenom} {self.etudiant.nom}" if self.etudiant else '',
            'id_caisse':     self.id_caisse,
            'caisse':        self.caisse.nom if self.caisse else '',
            'montant':       float(self.montant),
            'mode_paiement': self.mode_paiement,
            'motif':         self.motif or '',
            'reference':     self.reference or '',
            'date_paiement': self.date_paiement.strftime('%d/%m/%Y %H:%M')
        }


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 4 — Depense (déclarée ici pour les FK)
# ══════════════════════════════════════════════════════════════════════════════
class Depense(db.Model):
    __tablename__ = 'depense'
    id_depense    = db.Column(db.Integer, primary_key=True)
    id_caisse     = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=False)
    montant       = db.Column(db.Numeric(15, 2), nullable=False)
    motif         = db.Column(db.String(200), nullable=False)
    categorie     = db.Column(db.String(100), nullable=True)
    statut        = db.Column(db.String(20), default='en_attente')  # en_attente | validee | rejetee
    date_depense  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id_depense,
            'id_caisse':   self.id_caisse,
            'caisse':      self.caisse.nom if self.caisse else '',
            'montant':     float(self.montant),
            'motif':       self.motif,
            'categorie':   self.categorie or '',
            'statut':      self.statut,
            'date_depense': self.date_depense.strftime('%d/%m/%Y %H:%M')
        }
