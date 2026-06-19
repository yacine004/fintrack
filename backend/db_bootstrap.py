# -*- coding: utf-8 -*-
"""
Initialisation sûre de la base de données : crée les tables/colonnes manquantes
et ne seed des données de démo QUE si les tables correspondantes sont vides.
Ne supprime JAMAIS de données existantes. Utilisé à la fois par app.py (dev local)
et wsgi.py (production Render) pour garantir un comportement identique et idempotent.
"""
from extensions import db, bcrypt


def bootstrap_db(app):
    with app.app_context():
        db.create_all()
        print("✅ Tables créées / vérifiées")

        # Migration SQLite/Postgres : ajouter les colonnes manquantes si elles n'existent pas
        with db.engine.connect() as _conn:
            for _sql in [
                "ALTER TABLE paiement ADD COLUMN annee_academique VARCHAR(20)",
                "ALTER TABLE paiement ADD COLUMN id_createur INTEGER REFERENCES utilisateur(id_utilisateur)",
                "ALTER TABLE utilisateur ADD COLUMN civilite VARCHAR(10) DEFAULT 'M.'",
                # Workflow dépenses 3-acteurs (sprint 7)
                "ALTER TABLE depense ADD COLUMN statut VARCHAR(20) DEFAULT 'en_attente'",
                "ALTER TABLE depense ADD COLUMN id_demandeur INTEGER REFERENCES utilisateur(id_utilisateur)",
                "ALTER TABLE depense ADD COLUMN id_validateur INTEGER REFERENCES utilisateur(id_utilisateur)",
                "ALTER TABLE depense ADD COLUMN id_caissier INTEGER REFERENCES utilisateur(id_utilisateur)",
                "ALTER TABLE depense ADD COLUMN date_validation DATETIME",
                "ALTER TABLE depense ADD COLUMN date_paiement_sortie DATETIME",
                # Sprint 9 — Laissez-passer
                "ALTER TABLE autorisation_passage ADD COLUMN date_validite_lp DATE",
                # Sprint 9 — Validation RAF des frais annexes
                "ALTER TABLE frais_annexe ADD COLUMN motif_rejet VARCHAR(255)",
                "ALTER TABLE frais_annexe ADD COLUMN id_validateur INTEGER REFERENCES utilisateur(id_utilisateur)",
                "ALTER TABLE frais_annexe ADD COLUMN date_validation DATETIME",
            ]:
                try:
                    _conn.execute(db.text(_sql))
                    _conn.commit()
                    print(f"✅ Migration : {_sql.split('ADD COLUMN')[1].strip().split()[0]} ajouté")
                except Exception:
                    pass  # colonne déjà présente

        # Migration données : reformater les matricules au format ISM{code}/DK-{seq:05d}
        try:
            from models import Etudiant as _Etu
            from collections import defaultdict as _dd
            _old = db.session.query(_Etu).filter(~_Etu.matricule.like('%/DK-%')).all()
            if _old:
                # 1ère passe : valeurs temporaires pour éviter les conflits UNIQUE
                for _e in _old:
                    _e.matricule = f'_TEMP_{_e.id_etudiant}_'
                db.session.flush()
                # 2ème passe : regrouper par code année puis assigner en séquence
                _by_code = _dd(list)
                for _e in _old:
                    _ann = _e.annee_academique or '2025-2026'
                    _p = _ann.split('-')
                    _c = (_p[0][-2:] + _p[1][-2:]) if len(_p) == 2 else '2526'
                    _by_code[_c].append(_e)
                for _c, _elist in _by_code.items():
                    _elist.sort(key=lambda x: x.id_etudiant)
                    _pfx = f'ISM{_c}/DK-'
                    _existing = db.session.query(_Etu.matricule)\
                        .filter(_Etu.matricule.like(f'{_pfx}%')).all()
                    _mx = 0
                    for (_m,) in _existing:
                        _sfx = _m[len(_pfx):]
                        if _sfx.isdigit():
                            _mx = max(_mx, int(_sfx))
                    for _i, _e in enumerate(_elist, _mx + 1):
                        _e.matricule = f'{_pfx}{_i:05d}'
                db.session.commit()
                print(f"✅ Migration matricules : {len(_old)} étudiant(s) reformaté(s)")
        except Exception as _ex:
            print(f"⚠️ Migration matricules : {_ex}")

        # Seed année scolaire active
        from models import AnneeScolaire, ConfigApp
        from datetime import date as _date
        if db.session.query(AnneeScolaire).count() == 0:
            annee = AnneeScolaire(
                libelle='2025-2026',
                date_debut=_date(2025, 9, 1),
                date_fin=_date(2026, 8, 31),
                active=True
            )
            db.session.add(annee)
            db.session.commit()
            print("✅ Année scolaire 2025-2026 créée et activée")

        # Seed config par défaut (préfixe référence paiement)
        if db.session.query(ConfigApp).filter_by(cle='ref_prefixe').first() is None:
            db.session.add(ConfigApp(cle='ref_prefixe', valeur='FT'))
            db.session.commit()
            print("✅ Config par défaut : ref_prefixe=FT")

        from models import Utilisateur
        if db.session.query(Utilisateur).count() == 0:
            users = [
                Utilisateur(nom='Diop', prenom='Moussa', email='raf@fintrack.sn',
                            contact='77 000 00 01',
                            mot_de_passe_hash=bcrypt.generate_password_hash('raf123').decode(),
                            role='raf'),
                Utilisateur(nom='Diallo', prenom='Abdoul Salif', email='comptable@fintrack.sn',
                            contact='77 000 00 02',
                            mot_de_passe_hash=bcrypt.generate_password_hash('comptable123').decode(),
                            role='comptable'),
            ]
            db.session.add_all(users)
            db.session.commit()
            print("✅ Comptes créés")

        from models import Etudiant, Caisse, Budget
        if db.session.query(Etudiant).count() == 0:
            etudiants = [
                Etudiant(matricule='ISM2526/DK-00001', nom='Diallo', prenom='Mamadou',
                         email='m.diallo@ism.edu.sn', contact='77 111 11 11',
                         classe='L3', filiere='GLRS', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2526/DK-00002', nom='Sarr', prenom='Fatou',
                         email='f.sarr@ism.edu.sn', contact='77 222 22 22',
                         classe='M1', filiere='CDSD', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2526/DK-00003', nom='Ndiaye', prenom='Ousmane',
                         email='o.ndiaye@ism.edu.sn', contact='77 333 33 33',
                         classe='L2', filiere='GLRS', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2526/DK-00004', nom='Ba', prenom='Aminata',
                         email='a.ba@ism.edu.sn', contact='77 444 44 44',
                         classe='M2', filiere='CDSD', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2526/DK-00005', nom='Koné', prenom='Ibrahim',
                         email='i.kone@ism.edu.sn', contact='77 555 55 55',
                         classe='L3', filiere='GLRS', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2526/DK-00006', nom='Fall', prenom='Aïssatou',
                         email='a.fall@ism.edu.sn', contact='77 666 66 66',
                         classe='L1', filiere='GLRS', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2526/DK-00007', nom='Mbaye', prenom='Cheikh',
                         email='c.mbaye@ism.edu.sn', contact='77 777 77 77',
                         classe='L2', filiere='CDSD', annee_academique='2025-2026'),
            ]
            db.session.add_all(etudiants)
            db.session.commit()
            print("✅ Étudiants créés")

        if db.session.query(Caisse).count() == 0:
            caisses = [
                Caisse(nom='Caisse1', type_caisse='principale',
                       description='Caisse principale', solde_actuel=5000000.00),
                Caisse(nom='Caisse2', type_caisse='secondaire',
                       description='Caisse secondaire', solde_actuel=2500000.00),
                Caisse(nom='Caisse3', type_caisse='secondaire',
                       description='Caisse secondaire 2', solde_actuel=750000.00),
            ]
            db.session.add_all(caisses)
            db.session.commit()
            print("✅ Caisses créées")

        if db.session.query(Budget).count() == 0:
            budgets = [
                Budget(categorie='Fournitures',  montant_alloue=500000,  annee='2026'),
                Budget(categorie='Salaires',     montant_alloue=2000000, annee='2026'),
                Budget(categorie='Maintenance',  montant_alloue=300000,  annee='2026'),
                Budget(categorie='Evenements',   montant_alloue=400000,  annee='2026'),
                Budget(categorie='Informatique', montant_alloue=800000,  annee='2026'),
            ]
            db.session.add_all(budgets)
            db.session.commit()
            print("✅ Budgets créés")

        # ── Données historiques 2025 (comparaison N vs N-1) ──────────────────
        from models import Paiement, Depense
        from datetime import datetime
        from sqlalchemy import extract as sql_extract

        paiements_2025_count = db.session.query(Paiement).filter(
            sql_extract('year', Paiement.date_paiement) == 2025
        ).count()

        if paiements_2025_count == 0:
            etu  = db.session.query(Etudiant).limit(5).all()
            caisses_seed = db.session.query(Caisse).limit(3).all()
            if etu and caisses_seed:
                c1 = caisses_seed[0].id_caisse
                c2 = caisses_seed[1].id_caisse if len(caisses_seed) > 1 else c1
                e  = [e.id_etudiant for e in etu]

                paiements_hist = [
                    Paiement(id_etudiant=e[0], id_caisse=c1, montant=500000,
                             mode_paiement='especes',  motif='Frais scolarité S1',
                             date_paiement=datetime(2025, 1, 12)),
                    Paiement(id_etudiant=e[1], id_caisse=c1, montant=500000,
                             mode_paiement='virement', motif='Frais scolarité S1',
                             date_paiement=datetime(2025, 1, 20)),
                    Paiement(id_etudiant=e[2], id_caisse=c2, montant=350000,
                             mode_paiement='wave',     motif='Acompte scolarité',
                             date_paiement=datetime(2025, 2, 8)),
                    Paiement(id_etudiant=e[3], id_caisse=c1, montant=500000,
                             mode_paiement='cheque',   motif='Frais scolarité S1',
                             date_paiement=datetime(2025, 2, 18)),
                    Paiement(id_etudiant=e[4], id_caisse=c1, montant=500000,
                             mode_paiement='especes',  motif='Frais scolarité S1',
                             date_paiement=datetime(2025, 3, 5)),
                    Paiement(id_etudiant=e[0], id_caisse=c2, montant=450000,
                             mode_paiement='wave',     motif='Frais scolarité S2',
                             date_paiement=datetime(2025, 4, 10)),
                    Paiement(id_etudiant=e[1], id_caisse=c1, montant=500000,
                             mode_paiement='virement', motif='Frais scolarité S2',
                             date_paiement=datetime(2025, 5, 7)),
                    Paiement(id_etudiant=e[2], id_caisse=c1, montant=500000,
                             mode_paiement='especes',  motif='Frais scolarité S2',
                             date_paiement=datetime(2025, 6, 3)),
                    Paiement(id_etudiant=e[3], id_caisse=c2, montant=300000,
                             mode_paiement='wave',     motif='Acompte S2',
                             date_paiement=datetime(2025, 9, 15)),
                    Paiement(id_etudiant=e[4], id_caisse=c1, montant=500000,
                             mode_paiement='cheque',   motif='Frais scolarité S2',
                             date_paiement=datetime(2025, 10, 2)),
                    Paiement(id_etudiant=e[0], id_caisse=c1, montant=500000,
                             mode_paiement='especes',  motif='Frais inscription 2025-2026',
                             date_paiement=datetime(2025, 11, 18)),
                    Paiement(id_etudiant=e[1], id_caisse=c2, montant=400000,
                             mode_paiement='virement', motif='Frais inscription 2025-2026',
                             date_paiement=datetime(2025, 12, 5)),
                ]
                db.session.add_all(paiements_hist)

                depenses_hist = [
                    Depense(id_caisse=c1, montant=120000, motif='Achat fournitures bureau',
                            categorie='Fournitures', statut='validee',
                            date_depense=datetime(2025, 1, 25)),
                    Depense(id_caisse=c1, montant=750000, motif='Salaires personnel janvier',
                            categorie='Salaires',    statut='validee',
                            date_depense=datetime(2025, 2, 1)),
                    Depense(id_caisse=c2, montant=85000,  motif='Maintenance climatisation',
                            categorie='Maintenance', statut='validee',
                            date_depense=datetime(2025, 3, 14)),
                    Depense(id_caisse=c1, montant=160000, motif='Organisation journée portes ouvertes',
                            categorie='Evenements',  statut='validee',
                            date_depense=datetime(2025, 4, 22)),
                    Depense(id_caisse=c1, montant=210000, motif='Achat licences logiciels',
                            categorie='Informatique', statut='validee',
                            date_depense=datetime(2025, 5, 30)),
                    Depense(id_caisse=c1, montant=780000, motif='Salaires personnel second semestre',
                            categorie='Salaires',    statut='validee',
                            date_depense=datetime(2025, 9, 3)),
                    Depense(id_caisse=c2, montant=95000,  motif='Fournitures pédagogiques',
                            categorie='Fournitures', statut='validee',
                            date_depense=datetime(2025, 10, 20)),
                    Depense(id_caisse=c1, montant=175000, motif='Renouvellement équipements réseau',
                            categorie='Informatique', statut='validee',
                            date_depense=datetime(2025, 11, 28)),
                ]
                db.session.add_all(depenses_hist)
                db.session.commit()
                print("✅ Données historiques 2025 créées")

        # ── Seed catalogue de frais annexes ───────────────────────────────────
        from models import TypeFraisAnnexe
        if db.session.query(TypeFraisAnnexe).count() == 0:
            types_frais = [
                TypeFraisAnnexe(nom='Attestation de scolarité', montant=2000,
                                 description='Document attestant de l\'inscription en cours'),
                TypeFraisAnnexe(nom='Attestation de réussite', montant=3000,
                                 description='Document attestant de la réussite d\'une année'),
                TypeFraisAnnexe(nom='Relevé de notes (duplicata)', montant=2000,
                                 description='Réémission d\'un relevé de notes'),
                TypeFraisAnnexe(nom='Duplicata de diplôme', montant=25000,
                                 description='Réédition d\'un diplôme perdu ou endommagé'),
                TypeFraisAnnexe(nom='Carte étudiant (réémission)', montant=5000,
                                 description='Réédition de la carte étudiant perdue ou endommagée'),
                TypeFraisAnnexe(nom='Frais de rattrapage (par examen)', montant=10000,
                                 description='Inscription à une session de rattrapage'),
                TypeFraisAnnexe(nom='Frais de dossier (réinscription tardive)', montant=15000,
                                 description='Pénalité pour réinscription hors délai'),
            ]
            db.session.add_all(types_frais)
            db.session.commit()
            print(f"✅ Catalogue frais annexes créé : {len(types_frais)} type(s)")

        # ── Backfill annee_academique sur paiements existants ────────────────
        paiements_sans_annee = db.session.query(Paiement).filter(
            Paiement.annee_academique == None
        ).all()
        if paiements_sans_annee:
            for p in paiements_sans_annee:
                etu_p = db.session.get(Etudiant, p.id_etudiant)
                if etu_p:
                    p.annee_academique = etu_p.annee_academique
            db.session.commit()
            print(f"✅ Backfill annee_academique : {len(paiements_sans_annee)} paiement(s)")

        # ── Migration one-shot : rénumérotation séquentielle de tous les paiements ──
        # Runs once after all seeds. Assigns FT-YYYY-NNNNN in chronological order.
        if db.session.query(ConfigApp).filter_by(cle='ref_seq_v1').first() is None:
            from models import AnneeScolaire as _AS
            _prefix_cfg = db.session.query(ConfigApp).filter_by(cle='ref_prefixe').first()
            _prefix = _prefix_cfg.valeur if _prefix_cfg else 'FT'
            _annee_obj = db.session.query(_AS).filter_by(active=True).first()
            _libelle = _annee_obj.libelle if _annee_obj else '2025-2026'
            _parts = _libelle.split('-')
            _code  = (_parts[0][-2:] + _parts[1][-2:]) if len(_parts) == 2 else '2526'

            _tous = db.session.query(Paiement).order_by(
                Paiement.date_paiement.asc(), Paiement.id_paiement.asc()
            ).all()
            for _i, _p in enumerate(_tous, 1):
                _p.reference = f"{_prefix}-{_code}-{_i:05d}"

            _cpt = db.session.query(ConfigApp).filter_by(cle='ref_compteur').first()
            if _cpt:
                _cpt.valeur = str(len(_tous))
            else:
                db.session.add(ConfigApp(cle='ref_compteur', valeur=str(len(_tous))))
            db.session.add(ConfigApp(cle='ref_seq_v1', valeur='1'))
            db.session.commit()
            print(f"✅ Migration références séquentielles : {len(_tous)} paiement(s) renumérotés")
