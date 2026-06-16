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


def _get_data_rapport(type_rapport, periode, id_caisse=None, date_debut=None, date_fin=None):
    now = datetime.utcnow()

    if type_rapport == 'personnalise' and date_debut and date_fin:
        debut = datetime.strptime(date_debut, '%Y-%m-%d')
        fin   = datetime.strptime(date_fin,   '%Y-%m-%d').replace(hour=23, minute=59, second=59)
        periode = f"{debut.strftime('%d/%m/%Y')} → {fin.strftime('%d/%m/%Y')}"
    elif type_rapport == 'mensuel':
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

    q_paiements = db.session.query(Paiement).filter(
        Paiement.date_paiement >= debut,
        Paiement.date_paiement < fin
    )
    q_depenses = db.session.query(Depense).filter(
        Depense.date_depense >= debut,
        Depense.date_depense < fin,
        Depense.statut == 'validee'
    )

    if id_caisse:
        q_paiements = q_paiements.filter(Paiement.id_caisse == id_caisse)
        q_depenses  = q_depenses.filter(Depense.id_caisse == id_caisse)

    paiements = q_paiements.all()
    depenses  = q_depenses.all()

    nom_caisse = None
    if id_caisse:
        c = db.session.get(Caisse, id_caisse)
        nom_caisse = c.nom if c else None

    total_recettes = sum(float(p.montant) for p in paiements)
    total_depenses = sum(float(d.montant) for d in depenses)

    return {
        'periode':        periode,
        'type':           type_rapport,
        'debut':          debut.strftime('%d/%m/%Y'),
        'fin':            fin.strftime('%d/%m/%Y'),
        'id_caisse':      id_caisse,
        'nom_caisse':     nom_caisse or 'Toutes les caisses',
        'nb_paiements':   len(paiements),
        'total_recettes': total_recettes,
        'total_depenses': total_depenses,
        'solde_net':      total_recettes - total_depenses,
        'paiements':      [p.to_dict() for p in paiements[:50]],
        'depenses':       [d.to_dict() for d in depenses[:50]],
    }


# ── GÉNÉRER un rapport ────────────────────────────────────────────────────────
@rapports_bp.route('', methods=['POST'])
@raf_required
def generer():
    data         = request.get_json()
    type_rapport = data.get('type', 'mensuel')
    periode      = data.get('periode', datetime.utcnow().strftime('%Y-%m'))
    format_exp   = data.get('format', 'pdf')
    id_caisse    = data.get('id_caisse') or None
    date_debut   = data.get('date_debut') or None
    date_fin     = data.get('date_fin')   or None
    if id_caisse:
        id_caisse = int(id_caisse)

    if type_rapport not in ('mensuel', 'trimestriel', 'annuel', 'personnalise'):
        return jsonify({'message': 'Type invalide'}), 400
    if format_exp not in ('pdf', 'excel', 'csv'):
        return jsonify({'message': 'Format invalide : pdf | excel | csv'}), 400
    if type_rapport == 'personnalise' and not (date_debut and date_fin):
        return jsonify({'message': 'Date de début et de fin obligatoires pour un rapport personnalisé'}), 400

    import json
    donnees = _get_data_rapport(type_rapport, periode, id_caisse, date_debut, date_fin)

    rapport = Rapport(
        type=type_rapport,
        periode=periode,
        contenu=json.dumps(donnees),
        format=format_exp,
        id_caisse=id_caisse
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
    elif format_exp == 'csv':
        return _export_csv(rapport, donnees)
    else:
        return jsonify({'message': 'Format invalide'}), 400


MODE_LABELS_R = {
    'especes':  'Espèces',
    'virement': 'Virement bancaire',
    'cheque':   'Chèque',
    'wave':     'Wave / Mobile Money',
}

TYPE_LABELS = {'mensuel': 'Mensuel', 'trimestriel': 'Trimestriel',
               'annuel': 'Annuel', 'personnalise': 'Personnalisé'}


def _export_pdf(rapport, donnees):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                        Table, TableStyle, HRFlowable)
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

        buffer = io.BytesIO()
        doc    = SimpleDocTemplate(buffer, pagesize=A4,
                                   rightMargin=1.8*cm, leftMargin=1.8*cm,
                                   topMargin=1.5*cm, bottomMargin=1.5*cm)

        BLUE  = colors.HexColor('#1B3A6B')
        LBLUE = colors.HexColor('#2D5FA8')
        GREEN = colors.HexColor('#16A34A')
        RED   = colors.HexColor('#DC2626')
        GRAY  = colors.HexColor('#64748B')
        LGRAY = colors.HexColor('#F1F5F9')
        BGRAY = colors.HexColor('#E2E8F0')
        WHITE = colors.white

        type_lbl   = TYPE_LABELS.get(donnees['type'], donnees['type'].capitalize())
        solde_net  = donnees['solde_net']
        gen_date   = rapport.date_creation.strftime('%d/%m/%Y à %H:%M')
        elems      = []

        # ── EN-TÊTE établissement ─────────────────────────────────────────────
        hdr = [[
            Paragraph(
                '<b>ISM DAKAR</b><br/>École d\'Ingénieurs et Digital Campus<br/>'
                'BP 3278 — Dakar, Sénégal | www.ism.edu.sn',
                ParagraphStyle('hl', fontSize=10, textColor=WHITE,
                               fontName='Helvetica-Bold', leading=15)),
            Paragraph(
                f'<b>RAPPORT FINANCIER</b><br/>{type_lbl}<br/>'
                f'Généré le {gen_date}',
                ParagraphStyle('hr', fontSize=9.5, textColor=WHITE,
                               fontName='Helvetica', leading=14, alignment=TA_RIGHT)),
        ]]
        ht = Table(hdr, colWidths=[10*cm, 7*cm])
        ht.setStyle(TableStyle([
            ('BACKGROUND', (0,0),(-1,-1), BLUE),
            ('PADDING',    (0,0),(-1,-1), 14),
            ('VALIGN',     (0,0),(-1,-1), 'MIDDLE'),
        ]))
        elems.append(ht)

        # ── BANDEAU PÉRIODE ───────────────────────────────────────────────────
        elems.append(Table(
            [[Paragraph(
                f'Période : {donnees["debut"]} → {donnees["fin"]}  |  Caisse : {donnees["nom_caisse"]}',
                ParagraphStyle('p', fontSize=10, textColor=WHITE,
                               fontName='Helvetica-Bold', alignment=TA_CENTER))]],
            colWidths=[17*cm],
            style=[('BACKGROUND',(0,0),(-1,-1), LBLUE), ('PADDING',(0,0),(-1,-1), 7)]
        ))
        elems.append(Spacer(1, 0.5*cm))

        # ── KPI CARDS (3 colonnes) ────────────────────────────────────────────
        def kpi_cell(label, valeur, couleur):
            return Paragraph(
                f'<font size="8" color="#64748B">{label}</font><br/>'
                f'<font size="16"><b>{valeur}</b></font>',
                ParagraphStyle('k', alignment=TA_CENTER, textColor=couleur, leading=20))

        kpi_row = [[
            kpi_cell('TOTAL RECETTES',
                     f"{donnees['total_recettes']:,.0f} FCFA".replace(',', ' '), GREEN),
            kpi_cell('TOTAL DÉPENSES',
                     f"{donnees['total_depenses']:,.0f} FCFA".replace(',', ' '), RED),
            kpi_cell('SOLDE NET',
                     f"{solde_net:,.0f} FCFA".replace(',', ' '),
                     GREEN if solde_net >= 0 else RED),
            kpi_cell('NB. PAIEMENTS', str(donnees['nb_paiements']), BLUE),
        ]]
        kpi_t = Table(kpi_row, colWidths=[4.25*cm]*4)
        kpi_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0),(0,-1), colors.HexColor('#F0FDF4')),
            ('BACKGROUND', (1,0),(1,-1), colors.HexColor('#FEF2F2')),
            ('BACKGROUND', (2,0),(2,-1),
             colors.HexColor('#F0FDF4') if solde_net >= 0 else colors.HexColor('#FEF2F2')),
            ('BACKGROUND', (3,0),(3,-1), colors.HexColor('#EFF6FF')),
            ('BOX',   (0,0),(0,-1), 1, GREEN),
            ('BOX',   (1,0),(1,-1), 1, RED),
            ('BOX',   (2,0),(2,-1), 1, GREEN if solde_net >= 0 else RED),
            ('BOX',   (3,0),(3,-1), 1, BLUE),
            ('PADDING',    (0,0),(-1,-1), 12),
            ('VALIGN',     (0,0),(-1,-1), 'MIDDLE'),
            ('LEFTPADDING',(0,0),(-1,-1), 6),
        ]))
        elems.append(kpi_t)
        elems.append(Spacer(1, 0.6*cm))

        # ── TABLEAU PAIEMENTS ─────────────────────────────────────────────────
        if donnees['paiements']:
            elems.append(Paragraph('DÉTAIL DES ENCAISSEMENTS',
                ParagraphStyle('sh', fontSize=9, textColor=BLUE,
                               fontName='Helvetica-Bold', spaceAfter=5)))
            p_data = [['N°', 'Étudiant', 'Montant (FCFA)', 'Mode', 'Caisse', 'Date']]
            for i, p in enumerate(donnees['paiements'], 1):
                p_data.append([
                    str(i),
                    p.get('etudiant', ''),
                    f"{float(p['montant']):,.0f}".replace(',', ' '),
                    MODE_LABELS_R.get(p.get('mode_paiement', ''), p.get('mode_paiement', '')),
                    p.get('caisse', ''),
                    p.get('date_paiement', '')[:10] if p.get('date_paiement') else '',
                ])
            p_t = Table(p_data, colWidths=[0.8*cm, 4.5*cm, 3.2*cm, 3*cm, 3*cm, 2.5*cm])
            p_t.setStyle(TableStyle([
                ('BACKGROUND',    (0,0),(-1,0), BLUE),
                ('TEXTCOLOR',     (0,0),(-1,0), WHITE),
                ('FONTNAME',      (0,0),(-1,0), 'Helvetica-Bold'),
                ('FONTSIZE',      (0,0),(-1,-1), 8),
                ('ROWBACKGROUNDS',(0,1),(-1,-1), [LGRAY, WHITE]),
                ('GRID',          (0,0),(-1,-1), 0.3, BGRAY),
                ('ALIGN',         (0,0),(-1,-1), 'CENTER'),
                ('ALIGN',         (1,1),(1,-1), 'LEFT'),
                ('PADDING',       (0,0),(-1,-1), 5),
            ]))
            elems.append(p_t)
            elems.append(Spacer(1, 0.5*cm))

        # ── TABLEAU DÉPENSES ──────────────────────────────────────────────────
        if donnees['depenses']:
            elems.append(Paragraph('DÉTAIL DES DÉPENSES VALIDÉES',
                ParagraphStyle('sh2', fontSize=9, textColor=BLUE,
                               fontName='Helvetica-Bold', spaceAfter=5)))
            d_data = [['N°', 'Motif', 'Montant (FCFA)', 'Catégorie', 'Caisse', 'Date']]
            for i, d in enumerate(donnees['depenses'], 1):
                d_data.append([
                    str(i),
                    d.get('motif', ''),
                    f"{float(d['montant']):,.0f}".replace(',', ' '),
                    d.get('categorie', ''),
                    d.get('caisse', ''),
                    d.get('date_depense', '')[:10] if d.get('date_depense') else '',
                ])
            d_t = Table(d_data, colWidths=[0.8*cm, 4.5*cm, 3.2*cm, 3*cm, 3*cm, 2.5*cm])
            d_t.setStyle(TableStyle([
                ('BACKGROUND',    (0,0),(-1,0), colors.HexColor('#7F1D1D')),
                ('TEXTCOLOR',     (0,0),(-1,0), WHITE),
                ('FONTNAME',      (0,0),(-1,0), 'Helvetica-Bold'),
                ('FONTSIZE',      (0,0),(-1,-1), 8),
                ('ROWBACKGROUNDS',(0,1),(-1,-1), [colors.HexColor('#FEF2F2'), WHITE]),
                ('GRID',          (0,0),(-1,-1), 0.3, BGRAY),
                ('ALIGN',         (0,0),(-1,-1), 'CENTER'),
                ('ALIGN',         (1,1),(1,-1), 'LEFT'),
                ('PADDING',       (0,0),(-1,-1), 5),
            ]))
            elems.append(d_t)
            elems.append(Spacer(1, 0.5*cm))

        # ── SIGNATURE RAF ─────────────────────────────────────────────────────
        elems.append(Spacer(1, 0.3*cm))
        sig_t = Table(
            [[Paragraph('Le Responsable Administratif et Financier (RAF)',
                ParagraphStyle('sc', fontSize=9, fontName='Helvetica-Bold',
                               textColor=BLUE, alignment=TA_RIGHT)),
              ''],
             [Paragraph('<br/><br/>Signature et cachet :',
                ParagraphStyle('ss', fontSize=8, textColor=GRAY, alignment=TA_RIGHT)),
              '']],
            colWidths=[10*cm, 7*cm]
        )
        elems.append(sig_t)

        # ── PIED DE PAGE ──────────────────────────────────────────────────────
        elems.append(Spacer(1, 0.3*cm))
        elems.append(HRFlowable(width='100%', thickness=1, color=BLUE))
        elems.append(Paragraph(
            f'FinTrack — ISM Dakar École d\'Ingénieurs et Digital Campus  |  '
            f'Rapport {type_lbl}  |  {donnees["debut"]} → {donnees["fin"]}',
            ParagraphStyle('ft', fontSize=7.5, textColor=GRAY, alignment=TA_CENTER)
        ))

        doc.build(elems)
        buffer.seek(0)

        return send_file(buffer, mimetype='application/pdf', as_attachment=False,
                         download_name=f'rapport_{donnees["type"]}_{donnees["periode"]}.pdf')

    except ImportError:
        return jsonify({'message': 'ReportLab non installé'}), 500
    except Exception as e:
        return jsonify({'message': f'Erreur PDF : {str(e)}'}), 500


def _export_excel(rapport, donnees):
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        BLUE_FILL  = PatternFill(start_color='1B3A6B', end_color='1B3A6B', fill_type='solid')
        LBLUE_FILL = PatternFill(start_color='2D5FA8', end_color='2D5FA8', fill_type='solid')
        GREEN_FILL = PatternFill(start_color='F0FDF4', end_color='F0FDF4', fill_type='solid')
        RED_FILL   = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')
        ALT_FILL   = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')
        LGRAY_FILL = PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid')
        WHITE_FONT = Font(color='FFFFFF', bold=True, size=11)
        BLUE_FONT  = Font(color='1B3A6B', bold=True, size=11)
        THIN = Border(
            left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),  bottom=Side(style='thin', color='E2E8F0')
        )
        CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
        LEFT   = Alignment(horizontal='left',   vertical='center', wrap_text=True)

        type_lbl = TYPE_LABELS.get(donnees['type'], donnees['type'].capitalize())
        wb = openpyxl.Workbook()

        # ── Feuille 1 : RÉSUMÉ ────────────────────────────────────────────────
        ws1 = wb.active
        ws1.title = 'Résumé'
        ws1.sheet_view.showGridLines = False

        # Ligne 1 : titre établissement
        ws1.merge_cells('A1:F1')
        ws1['A1'] = 'ISM DAKAR — École d\'Ingénieurs et Digital Campus'
        ws1['A1'].font  = WHITE_FONT
        ws1['A1'].fill  = BLUE_FILL
        ws1['A1'].alignment = CENTER
        ws1.row_dimensions[1].height = 30

        # Ligne 2 : sous-titre rapport
        ws1.merge_cells('A2:F2')
        ws1['A2'] = (f'Rapport Financier {type_lbl} | Période : {donnees["debut"]} → {donnees["fin"]} | '
                     f'Caisse : {donnees["nom_caisse"]} | Généré le {rapport.date_creation.strftime("%d/%m/%Y")}')
        ws1['A2'].font      = Font(color='FFFFFF', size=10)
        ws1['A2'].fill      = LBLUE_FILL
        ws1['A2'].alignment = CENTER
        ws1.row_dimensions[2].height = 22

        # Ligne 4 : en-têtes KPI
        ws1.merge_cells('A4:B4')
        ws1['A4'] = 'INDICATEURS CLÉS'
        ws1['A4'].font  = BLUE_FONT
        ws1['A4'].fill  = LGRAY_FILL
        ws1['A4'].alignment = CENTER
        ws1.row_dimensions[4].height = 20

        kpis = [
            ('Total recettes',       donnees['total_recettes'],    '16A34A', GREEN_FILL),
            ('Total dépenses',       donnees['total_depenses'],    'DC2626', RED_FILL),
            ('Solde net',            donnees['solde_net'],
             '16A34A' if donnees['solde_net'] >= 0 else 'DC2626',
             GREEN_FILL if donnees['solde_net'] >= 0 else RED_FILL),
            ('Nombre de paiements',  donnees['nb_paiements'],      '1B3A6B', LGRAY_FILL),
            ('Nombre de dépenses',   len(donnees['depenses']),     '1B3A6B', LGRAY_FILL),
        ]
        for i, (label, val, color, fill) in enumerate(kpis, start=5):
            ws1.row_dimensions[i].height = 22
            ws1[f'A{i}'] = label
            ws1[f'A{i}'].font      = Font(bold=True, size=10)
            ws1[f'A{i}'].alignment = LEFT
            ws1[f'A{i}'].border    = THIN
            ws1[f'B{i}'] = val
            ws1[f'B{i}'].font          = Font(color=color, bold=True, size=11)
            ws1[f'B{i}'].number_format = '#,##0'
            ws1[f'B{i}'].fill          = fill
            ws1[f'B{i}'].alignment     = CENTER
            ws1[f'B{i}'].border        = THIN
            ws1[f'A{i}'].fill          = LGRAY_FILL

        ws1.column_dimensions['A'].width = 28
        ws1.column_dimensions['B'].width = 22

        # ── Feuille 2 : PAIEMENTS ─────────────────────────────────────────────
        ws2 = wb.create_sheet('Paiements')
        ws2.sheet_view.showGridLines = False

        ws2.merge_cells('A1:G1')
        ws2['A1'] = f'Détail des Paiements — {donnees["debut"]} → {donnees["fin"]}'
        ws2['A1'].font  = WHITE_FONT
        ws2['A1'].fill  = BLUE_FILL
        ws2['A1'].alignment = CENTER
        ws2.row_dimensions[1].height = 28

        p_headers = ['N°', 'Matricule', 'Étudiant', 'Montant (FCFA)', 'Mode', 'Caisse', 'Date']
        for col, h in enumerate(p_headers, 1):
            c = ws2.cell(row=2, column=col, value=h)
            c.font      = Font(color='1B3A6B', bold=True, size=10)
            c.fill      = LGRAY_FILL
            c.border    = THIN
            c.alignment = CENTER
        ws2.row_dimensions[2].height = 20

        for i, p in enumerate(donnees['paiements'], 1):
            row = i + 2
            vals = [
                i,
                p.get('matricule', ''),
                p.get('etudiant', ''),
                float(p['montant']),
                MODE_LABELS_R.get(p.get('mode_paiement',''), p.get('mode_paiement','')),
                p.get('caisse', ''),
                p.get('date_paiement', '')[:10] if p.get('date_paiement') else '',
            ]
            fill = ALT_FILL if i % 2 == 0 else None
            for col, val in enumerate(vals, 1):
                c = ws2.cell(row=row, column=col, value=val)
                c.border    = THIN
                c.alignment = CENTER if col != 3 else LEFT
                if col == 4:
                    c.number_format = '#,##0'
                    c.font = Font(color='16A34A', bold=True)
                if fill:
                    c.fill = fill
            ws2.row_dimensions[row].height = 18

        col_widths_p = [5, 14, 24, 18, 20, 18, 12]
        for i, w in enumerate(col_widths_p, 1):
            ws2.column_dimensions[get_column_letter(i)].width = w

        # ── Feuille 3 : DÉPENSES ──────────────────────────────────────────────
        ws3 = wb.create_sheet('Dépenses')
        ws3.sheet_view.showGridLines = False

        ws3.merge_cells('A1:G1')
        ws3['A1'] = f'Dépenses Validées — {donnees["debut"]} → {donnees["fin"]}'
        ws3['A1'].font  = Font(color='FFFFFF', bold=True, size=11)
        ws3['A1'].fill  = PatternFill(start_color='7F1D1D', end_color='7F1D1D', fill_type='solid')
        ws3['A1'].alignment = CENTER
        ws3.row_dimensions[1].height = 28

        d_headers = ['N°', 'Motif', 'Montant (FCFA)', 'Catégorie', 'Caisse', 'Statut', 'Date']
        for col, h in enumerate(d_headers, 1):
            c = ws3.cell(row=2, column=col, value=h)
            c.font      = Font(color='7F1D1D', bold=True, size=10)
            c.fill      = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')
            c.border    = THIN
            c.alignment = CENTER
        ws3.row_dimensions[2].height = 20

        for i, d in enumerate(donnees['depenses'], 1):
            row = i + 2
            vals = [
                i,
                d.get('motif', ''),
                float(d['montant']),
                d.get('categorie', ''),
                d.get('caisse', ''),
                d.get('statut', '').replace('_', ' ').capitalize(),
                d.get('date_depense', '')[:10] if d.get('date_depense') else '',
            ]
            fill = ALT_FILL if i % 2 == 0 else None
            for col, val in enumerate(vals, 1):
                c = ws3.cell(row=row, column=col, value=val)
                c.border    = THIN
                c.alignment = CENTER if col != 2 else LEFT
                if col == 3:
                    c.number_format = '#,##0'
                    c.font = Font(color='DC2626', bold=True)
                if fill:
                    c.fill = fill
            ws3.row_dimensions[row].height = 18

        col_widths_d = [5, 32, 18, 16, 18, 14, 12]
        for i, w in enumerate(col_widths_d, 1):
            ws3.column_dimensions[get_column_letter(i)].width = w

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return send_file(buffer,
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         as_attachment=True,
                         download_name=f'rapport_{donnees["type"]}_{donnees["periode"]}.xlsx')

    except ImportError:
        return jsonify({'message': 'openpyxl non installé. Exécutez : pip install openpyxl'}), 500
    except Exception as e:
        return jsonify({'message': f'Erreur Excel : {str(e)}'}), 500


def _export_csv(rapport, donnees):
    try:
        import csv

        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        type_lbl = TYPE_LABELS.get(donnees['type'], donnees['type'].capitalize())

        writer.writerow(['FinTrack — ISM Dakar'])
        writer.writerow([f"Rapport {type_lbl} | {donnees['debut']} → {donnees['fin']} | Caisse : {donnees['nom_caisse']}"])
        writer.writerow([f"Généré le {rapport.date_creation.strftime('%d/%m/%Y à %H:%M')}"])
        writer.writerow([])

        writer.writerow(['INDICATEURS CLÉS'])
        writer.writerow(['Total recettes (FCFA)', donnees['total_recettes']])
        writer.writerow(['Total dépenses (FCFA)', donnees['total_depenses']])
        writer.writerow(['Solde net (FCFA)',       donnees['solde_net']])
        writer.writerow(['Nombre de paiements',    donnees['nb_paiements']])
        writer.writerow(['Nombre de dépenses',     len(donnees['depenses'])])
        writer.writerow([])

        if donnees['paiements']:
            writer.writerow(['PAIEMENTS'])
            writer.writerow(['Matricule', 'Étudiant', 'Montant (FCFA)', 'Mode', 'Caisse', 'Date'])
            for p in donnees['paiements']:
                writer.writerow([
                    p.get('matricule', ''),
                    p.get('etudiant', ''),
                    float(p['montant']),
                    MODE_LABELS_R.get(p.get('mode_paiement', ''), p.get('mode_paiement', '')),
                    p.get('caisse', ''),
                    p.get('date_paiement', '')[:10] if p.get('date_paiement') else '',
                ])
            writer.writerow([])

        if donnees['depenses']:
            writer.writerow(['DÉPENSES VALIDÉES'])
            writer.writerow(['Motif', 'Montant (FCFA)', 'Catégorie', 'Caisse', 'Date'])
            for d in donnees['depenses']:
                writer.writerow([
                    d.get('motif', ''),
                    float(d['montant']),
                    d.get('categorie', ''),
                    d.get('caisse', ''),
                    d.get('date_depense', '')[:10] if d.get('date_depense') else '',
                ])

        # BOM UTF-8 pour compatibilité Excel
        content = '﻿' + output.getvalue()
        buffer = io.BytesIO(content.encode('utf-8'))

        return send_file(
            buffer,
            mimetype='text/csv; charset=utf-8',
            as_attachment=True,
            download_name=f'rapport_{donnees["type"]}_{donnees["periode"]}.csv'
        )

    except Exception as e:
        return jsonify({'message': f'Erreur CSV : {str(e)}'}), 500
