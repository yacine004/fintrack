from extensions import db
from models import ConfigApp, AnneeScolaire, Paiement


def _code_annee():
    annee = db.session.query(AnneeScolaire).filter_by(active=True).first()
    libelle = annee.libelle if annee else '2025-2026'
    parts = libelle.split('-')
    return (parts[0][-2:] + parts[1][-2:]) if len(parts) == 2 else '2526'


def generer_reference():
    """Incrémente atomiquement le compteur et retourne la prochaine référence."""
    cfg_prefix = db.session.query(ConfigApp).filter_by(cle='ref_prefixe').first()
    prefix = cfg_prefix.valeur if cfg_prefix else 'FT'

    cfg = db.session.query(ConfigApp).filter_by(cle='ref_compteur').with_for_update().first()
    if cfg is None:
        max_id = db.session.query(db.func.max(Paiement.id_paiement)).scalar() or 0
        cfg = ConfigApp(cle='ref_compteur', valeur=str(max_id))
        db.session.add(cfg)
    compteur = int(cfg.valeur) + 1
    cfg.valeur = str(compteur)
    return f"{prefix}-{_code_annee()}-{compteur:05d}"


def prochain_numero_reference():
    """Retourne la prochaine référence sans incrémenter (lecture seule)."""
    cfg_prefix = db.session.query(ConfigApp).filter_by(cle='ref_prefixe').first()
    prefix = cfg_prefix.valeur if cfg_prefix else 'FT'
    cfg = db.session.query(ConfigApp).filter_by(cle='ref_compteur').first()
    compteur = int(cfg.valeur) + 1 if cfg else 1
    return f"{prefix}-{_code_annee()}-{compteur:05d}"
