from app import create_app
from extensions import db, bcrypt

app = create_app()

with app.app_context():
    db.create_all()
    print("✅ Tables créées sur Render")

    from models import Utilisateur
    if db.session.query(Utilisateur).count() == 0:
        users = [
            Utilisateur(
                nom='Diop', prenom='Moussa',
                email='raf@fintrack.sn',
                mot_de_passe_hash=bcrypt.generate_password_hash('raf123').decode(),
                role='raf', actif=True
            ),
            Utilisateur(
                nom='Diallo', prenom='Abdoul Salif',
                email='comptable@fintrack.sn',
                mot_de_passe_hash=bcrypt.generate_password_hash('comptable123').decode(),
                role='comptable', actif=True
            ),
        ]
        db.session.add_all(users)
        db.session.commit()
        print("✅ Comptes créés sur Render")

if __name__ == '__main__':
    app.run()