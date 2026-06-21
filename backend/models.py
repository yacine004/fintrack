from datetime import datetime
from extensions import db


class Utilisateur(db.Model):
    __tablename__ = 'utilisateur'
    id_utilisateur    = db.Column(db.Integer, primary_key=True)
    nom               = db.Column(db.String(100), nullable=False)
    prenom            = db.Column(db.String(100), nullable=False)
    civilite          = db.Column(db.String(10), default='M.')   # 'M.' ou 'Mme'
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
                'civilite': self.civilite or 'M.',
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
    solde_actuel  = db.Column(db.Numeric(15, 2), default=0.00)  # héritage, non utilisé
    type_caisse   = db.Column(db.String(50), nullable=False)
    statut        = db.Column(db.String(20), default='active')
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    paiements     = db.relationship('Paiement', backref='caisse', lazy=True,
                                     foreign_keys='Paiement.id_caisse')
    depenses      = db.relationship('Depense', backref='caisse', lazy=True,
                                     foreign_keys='Depense.id_caisse')
    sessions      = db.relationship('SessionCaisse', backref='caisse', lazy=True,
                                     foreign_keys='SessionCaisse.id_caisse')
    def to_dict(self):
        from datetime import date as _date
        session_ouverte = next(
            (s for s in self.sessions if s.statut == 'ouverte' and s.date_session == _date.today()),
            None
        )
        return {'id': self.id_caisse, 'nom': self.nom,
                'description': self.description or '',
                'solde_actuel': float(self.solde_actuel or 0),
                'type_caisse': self.type_caisse, 'statut': self.statut,
                'date_creation': self.date_creation.strftime('%d/%m/%Y') if self.date_creation else '',
                'session_ouverte': session_ouverte.to_dict() if session_ouverte else None}


class Paiement(db.Model):
    __tablename__ = 'paiement'
    id_paiement   = db.Column(db.Integer, primary_key=True)
    id_etudiant   = db.Column(db.Integer, db.ForeignKey('etudiant.id_etudiant'), nullable=False)
    id_caisse     = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=False)
    id_createur   = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    montant       = db.Column(db.Numeric(15, 2), nullable=False)
    mode_paiement = db.Column(db.String(50), nullable=False)
    motif            = db.Column(db.String(200), nullable=True)
    reference        = db.Column(db.String(100), nullable=True)
    annee_academique = db.Column(db.String(20),  nullable=True)
    date_paiement    = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        createur = db.session.get(Utilisateur, self.id_createur) if self.id_createur else None
        return {'id': self.id_paiement, 'id_etudiant': self.id_etudiant,
                'matricule': self.etudiant.matricule if self.etudiant else '',
                'etudiant': f"{self.etudiant.prenom} {self.etudiant.nom}" if self.etudiant else '',
                'id_caisse': self.id_caisse, 'caisse': self.caisse.nom if self.caisse else '',
                'montant': float(self.montant), 'mode_paiement': self.mode_paiement,
                'motif': self.motif or '', 'reference': self.reference or '',
                'annee_academique': self.annee_academique or '',
                'date_paiement': self.date_paiement.strftime('%d/%m/%Y %H:%M'),
                'createur': f"{createur.prenom} {createur.nom}" if createur else '',
                'createur_role': createur.role if createur else ''}


class Depense(db.Model):
    __tablename__ = 'depense'
    id_depense   = db.Column(db.Integer, primary_key=True)
    id_caisse    = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=False)
    montant      = db.Column(db.Numeric(15, 2), nullable=False)
    motif        = db.Column(db.String(200), nullable=False)
    categorie    = db.Column(db.String(100), nullable=True)
    # statuts : en_attente → validee → payee  |  en_attente → rejetee
    statut               = db.Column(db.String(20), default='en_attente')
    date_depense         = db.Column(db.DateTime, default=datetime.utcnow)
    # Workflow 3 acteurs
    id_demandeur         = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    id_validateur        = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    id_caissier          = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    date_validation      = db.Column(db.DateTime, nullable=True)
    date_paiement_sortie = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        demandeur  = db.session.get(Utilisateur, self.id_demandeur)  if self.id_demandeur  else None
        validateur = db.session.get(Utilisateur, self.id_validateur) if self.id_validateur else None
        caissier   = db.session.get(Utilisateur, self.id_caissier)   if self.id_caissier   else None
        return {
            'id': self.id_depense, 'id_caisse': self.id_caisse,
            'caisse': self.caisse.nom if self.caisse else '',
            'montant': float(self.montant), 'motif': self.motif,
            'categorie': self.categorie or '', 'statut': self.statut,
            'date_depense': self.date_depense.strftime('%d/%m/%Y %H:%M'),
            'demandeur':  f"{demandeur.prenom} {demandeur.nom}"  if demandeur  else '',
            'demandeur_role': demandeur.role if demandeur else '',
            'validateur': f"{validateur.prenom} {validateur.nom}" if validateur else '',
            'caissier':   f"{caissier.prenom} {caissier.nom}"   if caissier   else '',
            'date_validation':      self.date_validation.strftime('%d/%m/%Y %H:%M')      if self.date_validation      else None,
            'date_paiement_sortie': self.date_paiement_sortie.strftime('%d/%m/%Y %H:%M') if self.date_paiement_sortie else None,
        }


class SessionCaisse(db.Model):
    __tablename__ = 'session_caisse'
    id_session    = db.Column(db.Integer, primary_key=True)
    id_caisse     = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=False)
    date_session  = db.Column(db.Date, nullable=False)
    statut        = db.Column(db.String(20), default='ouverte')  # ouverte | cloturee
    total_entrees = db.Column(db.Numeric(15, 2), default=0.00)
    total_sorties = db.Column(db.Numeric(15, 2), default=0.00)
    montant_depose_banque = db.Column(db.Numeric(15, 2), nullable=True)
    id_caissier_ouverture = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    id_caissier_cloture   = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    date_ouverture = db.Column(db.DateTime, default=datetime.utcnow)
    date_cloture   = db.Column(db.DateTime, nullable=True)
    commentaire    = db.Column(db.String(300), nullable=True)

    def to_dict(self):
        co = db.session.get(Utilisateur, self.id_caissier_ouverture) if self.id_caissier_ouverture else None
        cc = db.session.get(Utilisateur, self.id_caissier_cloture)   if self.id_caissier_cloture   else None
        return {
            'id': self.id_session,
            'id_caisse': self.id_caisse,
            'caisse': self.caisse.nom if self.caisse else '',
            'date_session': self.date_session.strftime('%d/%m/%Y'),
            'statut': self.statut,
            'total_entrees': float(self.total_entrees),
            'total_sorties': float(self.total_sorties),
            'solde_jour': round(float(self.total_entrees) - float(self.total_sorties), 2),
            'montant_depose_banque': float(self.montant_depose_banque) if self.montant_depose_banque is not None else None,
            'caissier_ouverture': f"{co.prenom} {co.nom}" if co else '',
            'caissier_cloture':   f"{cc.prenom} {cc.nom}" if cc else '',
            'date_ouverture': self.date_ouverture.strftime('%d/%m/%Y %H:%M') if self.date_ouverture else '',
            'date_cloture':   self.date_cloture.strftime('%d/%m/%Y %H:%M')   if self.date_cloture   else None,
            'commentaire': self.commentaire or '',
        }


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


class BudgetAnnuel(db.Model):
    """Statut de l'enveloppe budgétaire globale d'une année : une fois 'fixe',
    plus aucune ligne ne peut être créée/modifiée/supprimée — seules les
    réaffectations entre lignes existantes restent possibles."""
    __tablename__ = 'budget_annuel'
    id            = db.Column(db.Integer, primary_key=True)
    annee         = db.Column(db.String(20), unique=True, nullable=False)
    statut        = db.Column(db.String(20), nullable=False, default='brouillon')  # 'brouillon' | 'fixe'
    id_raf        = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    date_fixation = db.Column(db.DateTime, nullable=True)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        raf = db.session.get(Utilisateur, self.id_raf) if self.id_raf else None
        return {
            'id': self.id, 'annee': self.annee, 'statut': self.statut,
            'raf': f"{raf.prenom} {raf.nom}" if raf else '',
            'date_fixation': self.date_fixation.strftime('%d/%m/%Y %H:%M') if self.date_fixation else None,
        }


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
# SPRINT 7 — AffectationCaisse (caissier ↔ caisse planifiée par le RAF)
# ══════════════════════════════════════════════════════════════════════════════
class AffectationCaisse(db.Model):
    __tablename__ = 'affectation_caisse'
    id_affectation = db.Column(db.Integer, primary_key=True)
    id_utilisateur = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=False)
    id_caisse      = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'),       nullable=False)
    date_debut     = db.Column(db.DateTime, nullable=False)
    date_fin       = db.Column(db.DateTime, nullable=True)   # None = illimité
    actif          = db.Column(db.Boolean, default=True)
    date_creation  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        u = db.session.get(Utilisateur, self.id_utilisateur)
        c = db.session.get(Caisse,      self.id_caisse)
        return {
            'id':              self.id_affectation,
            'id_utilisateur':  self.id_utilisateur,
            'caissier':        f"{u.prenom} {u.nom}" if u else 'Inconnu',
            'caissier_email':  u.email if u else '',
            'id_caisse':       self.id_caisse,
            'caisse':          c.nom if c else 'Inconnue',
            'date_debut':      self.date_debut.strftime('%d/%m/%Y'),
            'date_fin':        self.date_fin.strftime('%d/%m/%Y') if self.date_fin else None,
            'actif':           self.actif,
        }


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 8 — Paramétrage année scolaire, autorisations, config app
# ══════════════════════════════════════════════════════════════════════════════

class AnneeScolaire(db.Model):
    __tablename__ = 'annee_scolaire'
    id            = db.Column(db.Integer, primary_key=True)
    libelle       = db.Column(db.String(20), unique=True, nullable=False)  # ex: "2025-2026"
    date_debut    = db.Column(db.Date, nullable=False)
    date_fin      = db.Column(db.Date, nullable=False)
    active        = db.Column(db.Boolean, default=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'libelle': self.libelle,
            'date_debut': self.date_debut.strftime('%d/%m/%Y'),
            'date_fin':   self.date_fin.strftime('%d/%m/%Y'),
            'active': self.active,
            'date_creation': self.date_creation.strftime('%d/%m/%Y'),
        }


class AutorisationPassage(db.Model):
    __tablename__ = 'autorisation_passage'
    id               = db.Column(db.Integer, primary_key=True)
    id_etudiant      = db.Column(db.Integer, db.ForeignKey('etudiant.id_etudiant'), nullable=False)
    annee            = db.Column(db.String(20), nullable=False)
    statut           = db.Column(db.String(20), nullable=False, default='en_attente')
    # statut: 'valide' | 'ajourn' | 'exclu' | 'en_attente' | 'laissez_passer'
    commentaire      = db.Column(db.Text, nullable=True)
    date_validite_lp = db.Column(db.Date, nullable=True)   # LP valide jusqu'au (laissez_passer)
    id_raf           = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    date_decision    = db.Column(db.DateTime, nullable=True)
    date_creation    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        etu = db.session.get(Etudiant, self.id_etudiant)
        raf = db.session.get(Utilisateur, self.id_raf) if self.id_raf else None
        return {
            'id': self.id,
            'id_etudiant': self.id_etudiant,
            'matricule':   etu.matricule if etu else '',
            'etudiant':    f"{etu.prenom} {etu.nom}" if etu else '',
            'classe':      etu.classe if etu else '',
            'filiere':     etu.filiere if etu else '',
            'annee':       self.annee,
            'statut':      self.statut,
            'commentaire': self.commentaire or '',
            'date_validite_lp': self.date_validite_lp.strftime('%Y-%m-%d') if self.date_validite_lp else None,
            'raf':         f"{raf.prenom} {raf.nom}" if raf else '',
            'date_decision': self.date_decision.strftime('%d/%m/%Y %H:%M') if self.date_decision else None,
            'date_creation': self.date_creation.strftime('%d/%m/%Y'),
        }


class ConfigApp(db.Model):
    """Clé/valeur de configuration globale de l'application."""
    __tablename__ = 'config_app'
    id    = db.Column(db.Integer, primary_key=True)
    cle   = db.Column(db.String(100), unique=True, nullable=False)
    valeur = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {'cle': self.cle, 'valeur': self.valeur or ''}


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


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 9 — Frais annexes (rattrapage, attestation, duplicata, carte, etc.)
# ══════════════════════════════════════════════════════════════════════════════
class TypeFraisAnnexe(db.Model):
    __tablename__ = 'type_frais_annexe'
    id            = db.Column(db.Integer, primary_key=True)
    nom           = db.Column(db.String(150), unique=True, nullable=False)
    montant       = db.Column(db.Numeric(15, 2), nullable=False)
    description   = db.Column(db.String(255), nullable=True)
    actif         = db.Column(db.Boolean, default=True)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'nom': self.nom, 'montant': float(self.montant),
            'description': self.description or '', 'actif': self.actif,
        }


class FraisAnnexe(db.Model):
    __tablename__ = 'frais_annexe'
    id            = db.Column(db.Integer, primary_key=True)
    id_etudiant   = db.Column(db.Integer, db.ForeignKey('etudiant.id_etudiant'), nullable=False)
    id_type       = db.Column(db.Integer, db.ForeignKey('type_frais_annexe.id'), nullable=False)
    montant       = db.Column(db.Numeric(15, 2), nullable=False)
    statut        = db.Column(db.String(20), default='en_attente')
    # statut: 'en_attente' | 'validee' | 'rejetee' | 'paye' | 'annule'
    id_caisse     = db.Column(db.Integer, db.ForeignKey('caisse.id_caisse'), nullable=True)
    mode_paiement = db.Column(db.String(50), nullable=True)
    reference     = db.Column(db.String(100), nullable=True)
    commentaire   = db.Column(db.String(255), nullable=True)
    motif_rejet   = db.Column(db.String(255), nullable=True)
    id_createur   = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    id_validateur = db.Column(db.Integer, db.ForeignKey('utilisateur.id_utilisateur'), nullable=True)
    date_creation   = db.Column(db.DateTime, default=datetime.utcnow)
    date_validation = db.Column(db.DateTime, nullable=True)
    date_paiement   = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        etu        = db.session.get(Etudiant, self.id_etudiant)
        typ        = db.session.get(TypeFraisAnnexe, self.id_type)
        caisse     = db.session.get(Caisse, self.id_caisse) if self.id_caisse else None
        createur   = db.session.get(Utilisateur, self.id_createur) if self.id_createur else None
        validateur = db.session.get(Utilisateur, self.id_validateur) if self.id_validateur else None
        return {
            'id': self.id,
            'id_etudiant': self.id_etudiant,
            'matricule':   etu.matricule if etu else '',
            'etudiant':    f"{etu.prenom} {etu.nom}" if etu else '',
            'classe':      etu.classe if etu else '',
            'id_type':     self.id_type,
            'type_nom':    typ.nom if typ else '',
            'montant':     float(self.montant),
            'statut':      self.statut,
            'id_caisse':   self.id_caisse,
            'caisse':      caisse.nom if caisse else '',
            'mode_paiement': self.mode_paiement or '',
            'reference':     self.reference or '',
            'commentaire':   self.commentaire or '',
            'motif_rejet':   self.motif_rejet or '',
            'createur':      f"{createur.prenom} {createur.nom}" if createur else '',
            'validateur':    f"{validateur.prenom} {validateur.nom}" if validateur else '',
            'date_creation':   self.date_creation.strftime('%d/%m/%Y %H:%M'),
            'date_validation': self.date_validation.strftime('%d/%m/%Y %H:%M') if self.date_validation else None,
            'date_paiement':   self.date_paiement.strftime('%d/%m/%Y %H:%M') if self.date_paiement else None,
        }


# ══════════════════════════════════════════════════════════════════════════════
# SPRINT 9 — Échéancier de paiement configurable (barème par niveau, par année)
# ══════════════════════════════════════════════════════════════════════════════
class LigneEcheancier(db.Model):
    """Une ligne du barème ISM pour un niveau donné, sur une année scolaire donnée.
    decalage_annee : 0 = année de début de l'année académique (ex. sept-déc 2025),
                      1 = année de fin (ex. jan-juin 2026)."""
    __tablename__ = 'ligne_echeancier'
    id             = db.Column(db.Integer, primary_key=True)
    id_annee       = db.Column(db.Integer, db.ForeignKey('annee_scolaire.id'), nullable=False)
    niveau         = db.Column(db.String(10), nullable=False)   # L1, L2, L3, M1, M2
    type_ligne     = db.Column(db.String(20), nullable=False)   # 'inscription' | 'scolarite' | 'encadrement'
    label          = db.Column(db.String(150), nullable=False)
    mois           = db.Column(db.Integer, nullable=False)      # 1-12
    jour           = db.Column(db.Integer, nullable=False, default=5)
    decalage_annee = db.Column(db.Integer, nullable=False, default=0)  # 0 ou 1
    montant        = db.Column(db.Numeric(15, 2), nullable=False)
    ordre          = db.Column(db.Integer, nullable=False, default=0)
    date_creation  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'id_annee': self.id_annee, 'niveau': self.niveau,
            'type_ligne': self.type_ligne, 'label': self.label,
            'mois': self.mois, 'jour': self.jour,
            'decalage_annee': self.decalage_annee,
            'montant': float(self.montant), 'ordre': self.ordre,
        }
