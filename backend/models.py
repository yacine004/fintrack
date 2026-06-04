from datetime import datetime
from extensions import db

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
            'id':             self.id_utilisateur,
            'nom':            self.nom,
            'prenom':         self.prenom,
            'email':          self.email,
            'contact':        self.contact or '',
            'role':           self.role,
            'actif':          self.actif,
            'date_creation':  self.date_creation.strftime('%d/%m/%Y')
        }
