from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Rapport, Paiement, Depense, Caisse, Etudiant
from datetime import datetime
import io

rapports_bp = Blueprint('rapports', __name__)


def auth_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

def raf_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt().get('user', {})
        if identity.get('role') != 'raf':
            return jsonify({'message': 'Accès réservé au RAF'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _get_data_rapport(type_rapport, periode):
    """Collecte les données selon le type et la période."""
    now = datetime.utcnow()

    if type_rapport == 'mensuel':
        try:
            mois, annee = int(periode.split('-')[1]), int(periode.split('-')[0])
        except Exception:
            mois, annee = now.month, now.year
        debut = datetime(annee, mois, 1)
        fin   = datetime(annee, mois+1, 1) if mois < 12 else datetime(annee+1, 1, 1)
    elif type_rapport == 'trimestriel':
        try:
            trimestre, annee = int(periode.split('T')[1]), int(periode.split('T')[0])
        except Exception:
            trimestre, annee = (now.month - 1) // 3 + 1, now.year
        mois_debut = (trimestre - 1) * 3 + 1
        debut = datetime(annee, mois_debut, 1)
        fin   = datetime(annee, mois_debut + 3, 1) if mois_debut + 3 <= 12 else datetime(annee+1, 1, 1)
    else:  # annuel
        annee = int(periode) if periode.isdigit() else now.year
        debut = datetime(annee, 1, 1)
        fin   = datetime(annee + 1, 1, 1)

    paiements = db.session.query(Paiement).filter(
        Paiement.date_paiement >= debut,
        Paiement.date_paiement < fin
    ).all()

    depenses = db.session.query(Depense).filter(
        Depense.date_depense >= debut,
        Depense.date_depense < fin,
        Depense.statut == 'validee'
    ).all()

    total_recettes = sum(float(p.montant) for p in paiements)
    total_depenses = sum(float(d.montant) for d in depenses)

    return {
        'periode':        periode,
        'type':           type_rapport,
        'debut':          debut.strftime('%d/%m/%Y'),
        'fin':            fin.strftime('%d/%m/%Y'),
        'nb_paiements':   len(paiements),
        'total_recettes': total_recettes,
        'total_depenses': total_depenses,
        'solde_net':      total_recettes - total_depenses,
        'paiements':      [p.to_dict() for p in paiements[:50]],
        'depenses':       [d.to_dict() for d in depenses[:50]],
    }


# ── GÉNÉRER un rapport ────────────────────────────────────────────────────────
@rapports_bp.route('', methods=['POST'])
@auth_required
def generer():
    data         = request.get_json()
    type_rapport = data.get('type', 'mensuel')
    periode      = data.get('periode', datetime.utcnow().strftime('%Y-%m'))
    format_exp   = data.get('format', 'pdf')

    if type_rapport not in ('mensuel', 'trimestriel', 'annuel'):
        return jsonify({'message': 'Type invalide : mensuel | trimestriel | annuel'}), 400
    if format_exp not in ('pdf', 'excel'):
        return jsonify({'message': 'Format invalide : pdf | excel'}), 400

    import json
    donnees = _get_data_rapport(type_rapport, periode)

    rapport = Rapport(
        type=type_rapport,
        periode=periode,
        contenu=json.dumps(donnees),
        format=format_exp
    )
    db.session.add(rapport)
    db.session.commit()

    return jsonify({
        'message': 'Rapport généré avec succès',
        'rapport': rapport.to_dict(),
        'donnees': donnees
    }), 201


# ── LISTER les rapports ───────────────────────────────────────────────────────
@rapports_bp.route('', methods=['GET'])
@auth_required
def lister():
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))

    total    = db.session.query(Rapport).count()
    rapports = db.session.query(Rapport)\
        .order_by(Rapport.date_creation.desc())\
        .offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'rapports': [r.to_dict() for r in rapports],
        'total':    total,
        'page':     page,
        'nb_pages': (total + limit - 1) // limit
    }), 200


# ── EXPORTER un rapport ───────────────────────────────────────────────────────
@rapports_bp.route('/<int:rid>/export', methods=['GET'])
@auth_required
def exporter(rid):
    rapport = db.session.get(Rapport, rid)
    if not rapport:
        return jsonify({'message': 'Rapport introuvable'}), 404

    format_exp = request.args.get('format', rapport.format)
    import json
    donnees = json.loads(rapport.contenu)

    if format_exp == 'pdf':
        return _export_pdf(rapport, donnees)
    elif format_exp == 'excel':
        return _export_excel(rapport, donnees)
    else:
        return jsonify({'message': 'Format invalide'}), 400


def _export_pdf(rapport, donnees):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT

        buffer = io.BytesIO()
        doc    = SimpleDocTemplate(buffer, pagesize=A4,
                                   rightMargin=2*cm, leftMargin=2*cm,
                                   topMargin=2*cm, bottomMargin=2*cm)

        BLUE  = colors.HexColor('#1B3A6B')
        GREEN = colors.HexColor('#27AE60')
        RED   = colors.HexColor('#DC2626')
        GRAY  = colors.HexColor('#64748B')
        LIGHT = colors.HexColor('#F1F5F9')

        styles   = getSampleStyleSheet()
        elements = []

        s_title  = ParagraphStyle('t', fontSize=20, textColor=BLUE, alignment=TA_CENTER, fontName='Helvetica-Bold')
        s_sub    = ParagraphStyle('s', fontSize=11, textColor=GRAY, alignment=TA_CENTER)
        s_h2     = ParagraphStyle('h2', fontSize=13, textColor=BLUE, fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=6)
        s_normal = ParagraphStyle('n', fontSize=10)

        elements.append(Paragraph('FinTrack — Rapport Financier', s_title))
        elements.append(Paragraph('ISM Dakar — Plateforme de Gestion Financière', s_sub))
        elements.append(HRFlowable(width='100%', thickness=2, color=BLUE))
        elements.append(Spacer(1, 0.4*cm))

        # En-tête rapport
        type_label = {'mensuel': 'Mensuel', 'trimestriel': 'Trimestriel', 'annuel': 'Annuel'}
        elements.append(Paragraph(
            f'Rapport {type_label.get(donnees["type"], "")} — Période : {donnees["periode"]}',
            ParagraphStyle('rh', fontSize=14, textColor=colors.white, alignment=TA_CENTER,
                           fontName='Helvetica-Bold', backColor=BLUE, borderPadding=10)
        ))
        elements.append(Spacer(1, 0.3*cm))
        elements.append(Paragraph(
            f'Du {donnees["debut"]} au {donnees["fin"]}  |  Généré le {rapport.date_creation.strftime("%d/%m/%Y à %H:%M")}',
            ParagraphStyle('dt', fontSize=10, textColor=GRAY, alignment=TA_CENTER)
        ))
        elements.append(Spacer(1, 0.5*cm))

        # KPIs
        kpi_data = [
            ['Indicateur', 'Valeur'],
            ['Total recettes', f"{donnees['total_recettes']:,.0f} FCFA".replace(',', ' ')],
            ['Total dépenses', f"{donnees['total_depenses']:,.0f} FCFA".replace(',', ' ')],
            ['Solde net', f"{donnees['solde_net']:,.0f} FCFA".replace(',', ' ')],
            ['Nombre de paiements', str(donnees['nb_paiements'])],
        ]
        kpi_table = Table(kpi_data, colWidths=[8*cm, 8*cm])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), BLUE),
            ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
            ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0,0), (-1,-1), 11),
            ('FONTNAME',   (0,1), (0,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR',  (0,1), (0,-1), BLUE),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [LIGHT, colors.white]),
            ('GRID',       (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING',    (0,0), (-1,-1), 8),
            ('TEXTCOLOR',  (1,3), (1,3), GREEN if donnees['solde_net'] >= 0 else RED),
            ('FONTNAME',   (1,3), (1,3), 'Helvetica-Bold'),
        ]))
        elements.append(kpi_table)
        elements.append(Spacer(1, 0.5*cm))

        # Paiements récents
        if donnees['paiements']:
            elements.append(Paragraph('Détail des Paiements', s_h2))
            p_data = [['Étudiant', 'Montant (FCFA)', 'Mode', 'Date']]
            for p in donnees['paiements'][:20]:
                p_data.append([
                    p.get('etudiant', ''),
                    f"{float(p['montant']):,.0f}".replace(',', ' '),
                    p.get('mode_paiement', '').capitalize(),
                    p.get('date_paiement', '')
                ])
            p_table = Table(p_data, colWidths=[5*cm, 4*cm, 3*cm, 4*cm])
            p_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), BLUE),
                ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
                ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE',   (0,0), (-1,-1), 9),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [LIGHT, colors.white]),
                ('GRID',       (0,0), (-1,-1), 0.3, colors.HexColor('#E2E8F0')),
                ('PADDING',    (0,0), (-1,-1), 6),
            ]))
            elements.append(p_table)

        elements.append(Spacer(1, 1*cm))
        elements.append(HRFlowable(width='100%', thickness=1, color=BLUE))
        elements.append(Paragraph(
            'Ce rapport est généré automatiquement par FinTrack — ISM Dakar',
            ParagraphStyle('f', fontSize=9, textColor=GRAY, alignment=TA_CENTER)
        ))

        doc.build(elements)
        buffer.seek(0)

        return send_file(buffer, mimetype='application/pdf', as_attachment=False,
                         download_name=f'rapport_{donnees["type"]}_{donnees["periode"]}.pdf')

    except ImportError:
        return jsonify({'message': 'ReportLab non installé'}), 500


def _export_excel(rapport, donnees):
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"Rapport {donnees['type']}"

        BLUE_FILL  = PatternFill(start_color='1B3A6B', end_color='1B3A6B', fill_type='solid')
        GREEN_FILL = PatternFill(start_color='E8F5E9', end_color='E8F5E9', fill_type='solid')
        LIGHT_FILL = PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid')
        WHITE_FONT = Font(color='FFFFFF', bold=True, size=12)
        BLUE_FONT  = Font(color='1B3A6B', bold=True, size=11)
        THIN = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )

        # Titre
        ws.merge_cells('A1:E1')
        ws['A1'] = f'FinTrack — Rapport {donnees["type"].capitalize()} — {donnees["periode"]}'
        ws['A1'].font = Font(color='FFFFFF', bold=True, size=14)
        ws['A1'].fill = BLUE_FILL
        ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
        ws.row_dimensions[1].height = 35

        ws.merge_cells('A2:E2')
        ws['A2'] = f'Période : {donnees["debut"]} → {donnees["fin"]}'
        ws['A2'].alignment = Alignment(horizontal='center')
        ws['A2'].font = Font(color='64748B', size=11)

        # KPIs
        ws['A4'] = 'INDICATEURS CLÉS'
        ws['A4'].font = BLUE_FONT
        ws['A4'].fill = LIGHT_FILL

        kpis = [
            ('Total recettes', donnees['total_recettes']),
            ('Total dépenses', donnees['total_depenses']),
            ('Solde net', donnees['solde_net']),
            ('Nombre de paiements', donnees['nb_paiements']),
        ]
        for i, (label, val) in enumerate(kpis, start=5):
            ws[f'A{i}'] = label
            ws[f'A{i}'].font = Font(bold=True)
            ws[f'B{i}'] = val
            ws[f'B{i}'].font = Font(
                color='27AE60' if (label == 'Solde net' and val >= 0) else
                      'DC2626' if (label == 'Solde net' and val < 0) else '000000',
                bold=True
            )
            ws[f'B{i}'].number_format = '#,##0'

        # Paiements
        if donnees['paiements']:
            row = 11
            ws.merge_cells(f'A{row}:E{row}')
            ws[f'A{row}'] = 'DÉTAIL DES PAIEMENTS'
            ws[f'A{row}'].font = WHITE_FONT
            ws[f'A{row}'].fill = BLUE_FILL
            ws[f'A{row}'].alignment = Alignment(horizontal='center')
            row += 1

            headers = ['Étudiant', 'Montant (FCFA)', 'Mode', 'Caisse', 'Date']
            for col, h in enumerate(headers, start=1):
                cell = ws.cell(row=row, column=col, value=h)
                cell.font = Font(bold=True, color='1B3A6B')
                cell.fill = LIGHT_FILL
                cell.border = THIN
            row += 1

            for p in donnees['paiements']:
                vals = [p.get('etudiant',''), float(p['montant']),
                        p.get('mode_paiement',''), p.get('caisse',''), p.get('date_paiement','')]
                for col, val in enumerate(vals, start=1):
                    cell = ws.cell(row=row, column=col, value=val)
                    cell.border = THIN
                    if col == 2:
                        cell.number_format = '#,##0'
                    if row % 2 == 0:
                        cell.fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')
                row += 1

        # Largeurs colonnes
        for col in range(1, 6):
            ws.column_dimensions[get_column_letter(col)].width = 22

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return send_file(buffer,
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         as_attachment=True,
                         download_name=f'rapport_{donnees["type"]}_{donnees["periode"]}.xlsx')

    except ImportError:
        return jsonify({'message': 'openpyxl non installé. Exécutez : pip install openpyxl'}), 500
