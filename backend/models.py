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
    role              = db.Column(db.String(50), nullable=False)
    actif             = db.Column(db.Boolean, default=True)
    date_creation     = db.Column(db.DateTime, default=datetime.utcnow)

    notifications     = db.relationship('Notification', backref='utilisateur', lazy=True,
                                         foreign_keys='Notification.id_utilisateur')
    messages_envoyes  = db.relationship('Message', backref='expediteur', lazy=True,
                                         foreign_keys='Message.id_expediteur')
    messages_recus    = db.relationship('Message', backref='destinataire', lazy=True,
                                         foreign_keys='Message.id_destinataire')
    audit_logs        = db.relationship('AuditLog', backref='utilisateur_audit', lazy=True,
                                         foreign_keys='AuditLog.id_utilisateur')

    def to_dict(self):
        return {'id': self.id_utilisateur, 'nom': self.nom, 'prenom': self.prenom,
                'email': self.email, 'contact': self.contact or '',
                'role': self.role, 'actif': self.actif,
                'date_creation': self.date_creation.strftime('%d/%m/%Y') if self.date_creation else ''}


class Etudiant(db.Model):
    __tablename__ = 'etudiant'
    id_etudiant      = db.Column(db.Integer, primary_key=True)
    matricule        = db.Column(db.String(50), unique=True, nullable=False)
    nom              = db.Column(db.String(100), nullable=False)
    prenom           = db.Column(db.String(100), nullable=False)
    email            = db.Column(db.String(150), unique=True, nullable=True)
    contact          = db.Column(db.String(50), nullable=True)
    classe           = db.Column(db.String(50), nullable=False)
    filiere          = db.Column(db.String(100), nullable=True)
    annee_academique = db.Column(db.String(20), nullable=False)
    statut           = db.Column(db.String(20), default='actif')
    date_inscription = db.Column(db.DateTime, default=datetime.utcnow)
    paiements        = db.relationship('Paiement', backref='etudiant', lazy=True,
                                        foreign_keys='Paiement.id_etudiant')
    def to_dict(self):
        return {'id': self.id_etudiant, 'matricule': self.matricule,
                'nom': self.nom, 'prenom': self.prenom,
                'email': self.email or '', 'contact': self.contact or '',
                'classe': self.classe, 'filiere': self.filiere or '',
                'annee_academique': self.annee_academique, 'statut': self.statut,
                'date_inscription': self.date_inscription.strftime('%d/%m/%Y')}


class Caisse(db.Model):
    __tablename__ = 'caisse'
    id_caisse     = db.Column(db.Integer, primary_key=True)
    nom           = db.Column(db.String(100), nullable=False)
    description   = db.Column(db.Text, nullable=True)
    solde_actuel  = db.Column(db.Numeric(15, 2), default=0.00)
    type_caisse   = db.Column(db.String(50), nullable=False)
    statut        = db.Column(db.String(20), default='active')
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    paiements     = db.relationship('Paiement', backref='caisse', lazy=True,
                                     foreign_keys='Paiement.id_caisse')
    depenses      = db.relationship('Depense', backref='caisse', lazy=True,
                                     foreign_keys='Depense.id_caisse')
    def to_dict(self):
        return {'id': self.id_caisse, 'nom': self.nom,
                'description': self.description or '',
                'solde_actuel': float(self.solde_actuel),
                'type_caisse': self.type_caisse, 'statut': self.statut,
                'date_creation': self.date_creation.strftime('%d/%m/%Y') if self.date_creation else ''}


class Paiement(db.Model):
    __tablename__ = 'paiement'
    id_paiement   = db.Column(db.Integer, primary_key=True)
    id_etudiant   = db.Column(db.Integer, db.ForeignKey('etudiant.id_etudiant'), nullable=False)
    id_caisse     = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=False)
    montant       = db.Column(db.Numeric(15, 2), nullable=False)
    mode_paiement = db.Column(db.String(50), nullable=False)
    motif         = db.Column(db.String(200), nullable=True)
    reference     = db.Column(db.String(100), nullable=True)
    date_paiement = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {'id': self.id_paiement, 'id_etudiant': self.id_etudiant,
                'etudiant': f"{self.etudiant.prenom} {self.etudiant.nom}" if self.etudiant else '',
                'id_caisse': self.id_caisse, 'caisse': self.caisse.nom if self.caisse else '',
                'montant': float(self.montant), 'mode_paiement': self.mode_paiement,
                'motif': self.motif or '', 'reference': self.reference or '',
                'date_paiement': self.date_paiement.strftime('%d/%m/%Y %H:%M')}


class Depense(db.Model):
    __tablename__ = 'depense'
    id_depense   = db.Column(db.Integer, primary_key=True)
    id_caisse    = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=False)
    montant      = db.Column(db.Numeric(15, 2), nullable=False)
    motif        = db.Column(db.String(200), nullable=False)
    categorie    = db.Column(db.String(100), nullable=True)
    statut       = db.Column(db.String(20), default='en_attente')
    date_depense = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {'id': self.id_depense, 'id_caisse': self.id_caisse,
                'caisse': self.caisse.nom if self.caisse else '',
                'montant': float(self.montant), 'motif': self.motif,
                'categorie': self.categorie or '', 'statut': self.statut,
                'date_depense': self.date_depense.strftime('%d/%m/%Y %H:%M')}


class Budget(db.Model):
    __tablename__ = 'budget'
    id_budget        = db.Column(db.Integer, primary_key=True)
    categorie        = db.Column(db.String(100), nullable=False)
    montant_alloue   = db.Column(db.Numeric(15, 2), nullable=False)
    montant_consomme = db.Column(db.Numeric(15, 2), default=0.00)
    annee            = db.Column(db.String(20), nullable=False)
    date_creation    = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {'id': self.id_budget, 'categorie': self.categorie,
                'montant_alloue': float(self.montant_alloue),
                'montant_consomme': float(self.montant_consomme),
                'annee': self.annee,
                'date_creation': self.date_creation.strftime('%d/%m/%Y') if self.date_creation else ''}


class Notification(db.Model):
    __tablename__ = 'notification'
    id_notification = db.Column(db.Integer, primary_key=True)
    id_utilisateur  = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=False)
    type            = db.Column(db.String(50), nullable=False)
    message         = db.Column(db.String(300), nullable=False)
    lu              = db.Column(db.Boolean, default=False)
    priorite        = db.Column(db.String(20), default='normale')
    date_creation   = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {'id': self.id_notification, 'id_utilisateur': self.id_utilisateur,
                'type': self.type, 'message': self.message, 'lu': self.lu,
                'priorite': self.priorite or 'normale',
                'date_creation': self.date_creation.strftime('%d/%m/%Y %H:%M')}


class Rapport(db.Model):
    __tablename__ = 'rapport'
    id_rapport    = db.Column(db.Integer, primary_key=True)
    type          = db.Column(db.String(50), nullable=False)
    periode       = db.Column(db.String(50), nullable=False)
    contenu       = db.Column(db.Text, nullable=True)
    format        = db.Column(db.String(20), default='pdf')
    id_caisse     = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=True)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {'id': self.id_rapport, 'type': self.type,
                'periode': self.periode, 'format': self.format,
                'id_caisse': self.id_caisse,
                'date_creation': self.date_creation.strftime('%d/%m/%Y %H:%M')}


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 6 — Message
# ══════════════════════════════════════════════════════════════════════════════
class Message(db.Model):
    __tablename__ = 'message'
    id_message       = db.Column(db.Integer, primary_key=True)
    id_expediteur    = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=False)
    id_destinataire  = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=False)
    objet            = db.Column(db.String(200), nullable=False)
    contenu          = db.Column(db.Text, nullable=False)
    lu               = db.Column(db.Boolean, default=False)
    date_envoi       = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        exp  = db.session.get(Utilisateur, self.id_expediteur)
        dest = db.session.get(Utilisateur, self.id_destinataire)
        return {
            'id':               self.id_message,
            'id_expediteur':    self.id_expediteur,
            'expediteur':       f"{exp.prenom} {exp.nom}" if exp else 'Inconnu',
            'expediteur_role':  exp.role if exp else '',
            'id_destinataire':  self.id_destinataire,
            'destinataire':     f"{dest.prenom} {dest.nom}" if dest else 'Inconnu',
            'objet':            self.objet,
            'contenu':          self.contenu,
            'lu':               self.lu,
            'date_envoi':       self.date_envoi.strftime('%d/%m/%Y %H:%M')
        }


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 6 — AuditLog
# ══════════════════════════════════════════════════════════════════════════════
class AuditLog(db.Model):
    __tablename__ = 'audit_log'
    id_audit       = db.Column(db.Integer, primary_key=True)
    id_utilisateur = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=False)
    action         = db.Column(db.String(100), nullable=False)
    entite         = db.Column(db.String(100), nullable=False)
    id_entite      = db.Column(db.Integer, nullable=True)
    details        = db.Column(db.Text, nullable=True)
    date_action    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':             self.id_audit,
            'id_utilisateur': self.id_utilisateur,
            'action':         self.action,
            'entite':         self.entite,
            'id_entite':      self.id_entite,
            'details':        self.details,
            'date_action':    self.date_action.strftime('%d/%m/%Y %H:%M')
        }
