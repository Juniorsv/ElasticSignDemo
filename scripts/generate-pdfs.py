#!/usr/bin/env python3
"""
Genera los 2 PDFs base para la demo de Elastic Signing de Gases del Oriente,
a partir de las plantillas REALES que usa el cliente para su cupo de credito
rotativo (Promesa de Contrato de Mutuo + Pagare en blanco con carta de
instrucciones).

Cada PDF contiene el texto legal de las plantillas del cliente y PLACEHOLDERS
visibles que luego se marcan como campos dinamicos en la consola web de
Docusign:

    {{nombre_deudor}}              {{tipo_documento_deudor}}
    {{numero_documento_deudor}}    {{direccion}}
    {{telefono}}                   {{monto_cupo}}
    {{nombre_codeudor}}            {{tipo_documento_codeudor}}
    {{numero_documento_codeudor}}  {{fecha}}

Uso:
    python3 scripts/generate-pdfs.py
Salida:
    docs/Promesa_Mutuo.pdf
    docs/Pagare.pdf
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
)

AZUL = HexColor("#12457a")
NARANJA = HexColor("#8bc53f")  # verde/lima del logo real
GRIS = HexColor("#444444")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "docs")
LOGO_PATH = os.path.join(BASE_DIR, "public", "assets", "gases-oriente-logo.png")
os.makedirs(OUT_DIR, exist_ok=True)


def styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("Marca", fontName="Helvetica-Bold", fontSize=13,
                          textColor=AZUL, spaceAfter=2))
    ss.add(ParagraphStyle("Sub", fontName="Helvetica", fontSize=8.5,
                          textColor=NARANJA, spaceAfter=10))
    ss.add(ParagraphStyle("TituloDoc", fontName="Helvetica-Bold", fontSize=13,
                          textColor=AZUL, spaceBefore=4, spaceAfter=8, alignment=TA_CENTER))
    ss.add(ParagraphStyle("H", fontName="Helvetica-Bold", fontSize=10,
                          textColor=AZUL, spaceBefore=8, spaceAfter=3))
    ss.add(ParagraphStyle("P", fontName="Helvetica", fontSize=9, leading=12.5,
                          textColor=GRIS, alignment=TA_JUSTIFY, spaceAfter=5))
    ss.add(ParagraphStyle("Campo", fontName="Helvetica-Bold", fontSize=9,
                          textColor=AZUL))
    ss.add(ParagraphStyle("CampoCell", fontName="Helvetica", fontSize=9,
                          textColor=GRIS))
    return ss


def encabezado(ss):
    el = []
    if os.path.exists(LOGO_PATH):
        img = Image(LOGO_PATH, width=3.6 * cm, height=1.7 * cm)
        img.hAlign = "LEFT"
        el.append(img)
    else:
        el.append(Paragraph("Gases del Oriente S.A. E.S.P.", ss["Marca"]))
    el.append(Spacer(1, 4))
    el.append(HRFlowable(width="100%", thickness=1.2, color=NARANJA, spaceAfter=8))
    return el


def datos_deudor_table(ss):
    """Tabla de identificacion del deudor / codeudor (fiel al pagare real)."""
    data = [
        [Paragraph("Nombre / Razon social", ss["Campo"]),
         Paragraph("Tipo Documento", ss["Campo"]),
         Paragraph("Numero Documento", ss["Campo"]),
         Paragraph("Calidad en la que firma", ss["Campo"])],
        [Paragraph("{{nombre_deudor}}", ss["CampoCell"]),
         Paragraph("{{tipo_documento_deudor}}", ss["CampoCell"]),
         Paragraph("{{numero_documento_deudor}}", ss["CampoCell"]),
         Paragraph("Deudor", ss["CampoCell"])],
        [Paragraph("{{nombre_codeudor}}", ss["CampoCell"]),
         Paragraph("{{tipo_documento_codeudor}}", ss["CampoCell"]),
         Paragraph("{{numero_documento_codeudor}}", ss["CampoCell"]),
         Paragraph("Codeudor", ss["CampoCell"])],
    ]
    t = Table(data, colWidths=[5.6 * cm, 3 * cm, 3.4 * cm, 3.4 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#eef3f8")),
        ("BOX", (0, 0), (-1, -1), 0.6, AZUL),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, HexColor("#c7d6e5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def firma_block(ss, titulo):
    data = [
        [Paragraph(titulo, ss["Campo"])],
        [Paragraph("Nombre: {{nombre_deudor}}", ss["CampoCell"])],
        [Paragraph("Tipo de identificacion: {{tipo_documento_deudor}}", ss["CampoCell"])],
        [Paragraph("Numero de identificacion: {{numero_documento_deudor}}", ss["CampoCell"])],
        [Paragraph("Direccion: {{direccion}}", ss["CampoCell"])],
        [Paragraph("Telefono: {{telefono}}", ss["CampoCell"])],
    ]
    t = Table(data, colWidths=[16.4 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, HexColor("#c7d6e5")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


# ----------------------------------------------------------------------
# PROMESA DE CONTRATO DE MUTUO
# ----------------------------------------------------------------------
def build_promesa(ss):
    el = encabezado(ss)
    el.append(Paragraph("PROPUESTA DE CONTRATO DE PROMESA DE MUTUO No. ______________", ss["TituloDoc"]))
    el.append(Paragraph(
        "<b>GASES DEL ORIENTE S.A. E.S.P</b>, identificada con NIT. 890.503.900-2, domiciliada "
        "en la ciudad de San Jose de Cucuta, en adelante <b>EL ACREEDOR</b>, propone la "
        "celebracion de un <b>CONTRATO DE PROMESA DE MUTUO</b>, en los siguientes terminos:", ss["P"]))

    el.append(Paragraph("1. Objeto.", ss["H"]))
    el.append(Paragraph(
        "EL ACREEDOR pone a disposicion del DEUDOR un cupo de credito rotativo hasta por "
        "<b>COP$ {{monto_cupo}}</b>, para ser utilizado en la adquisicion de productos y "
        "servicios de los comercios aliados de EL ACREEDOR, en adelante los Comercios "
        "Aliados, para ser pagado en cuotas sucesivas mensuales, cuyo monto quedara definido "
        "en la solicitud de utilizacion de cupo de credito que suscriba el DEUDOR, y que sera "
        "cobrado en la factura del servicio de gas prestado por GASES DEL ORIENTE S.A. E.S.P., "
        "ALCANOS DE COLOMBIA S.A. E.S.P. o METROGAS DE COLOMBIA S.A. E.S.P., en adelante las "
        "Empresas Vinculadas. El perfeccionamiento del contrato de mutuo se dara cuando EL "
        "ACREEDOR realice el desembolso directamente a los Comercios Aliados.", ss["P"]))

    el.append(Paragraph("2. Duracion y terminacion.", ss["H"]))
    el.append(Paragraph(
        "El contrato de promesa de mutuo es de duracion indefinida, pudiendo EL ACREEDOR "
        "terminarlo unilateralmente en cualquier momento. EL ACREEDOR podra dar por vencido "
        "el mutuo, debiendo EL DEUDOR pagar la totalidad de sus obligaciones, ante el "
        "incumplimiento o retardo en el pago de las cuotas, el cambio de domicilio sin previo "
        "aviso, conductas fraudulentas del DEUDOR o los demas casos autorizados por la ley.", ss["P"]))

    el.append(Paragraph("3. Autorizacion.", ss["H"]))
    el.append(Paragraph(
        "EL DEUDOR autoriza expresa e irrevocablemente a EL ACREEDOR y a las Empresas "
        "Vinculadas a realizar el cobro de las cuotas, intereses corrientes y de mora, seguro "
        "de vida deudores, gastos de cobranza pre-judicial y judicial, y otros conceptos "
        "asociados al mutuo, en la factura del servicio publico de gas correspondiente al "
        "predio ubicado en <b>{{direccion}}</b>.", ss["P"]))

    el.append(Paragraph("4. Pago.", ss["H"]))
    el.append(Paragraph(
        "EL DEUDOR pagara cuotas mensuales consecutivas de capital e intereses dentro del "
        "plazo establecido en la factura del servicio de gas. El cupo de credito se "
        "restablecera en la medida en que EL DEUDOR abone a capital. EL DEUDOR podra realizar "
        "abonos a capital o pagar anticipadamente la totalidad del mutuo sin penalizacion.", ss["P"]))

    el.append(Paragraph("5. Pagare en blanco con carta de instrucciones.", ss["H"]))
    el.append(Paragraph(
        "EL DEUDOR suscribira un pagare en blanco con carta de instrucciones como garantia "
        "del cumplimiento de las obligaciones derivadas del presente contrato de mutuo.", ss["P"]))

    el.append(Paragraph("6. Intereses.", ss["H"]))
    el.append(Paragraph(
        "La tasa de interes remuneratorio y moratorio variara mensualmente para ajustarse a "
        "la tasa maxima legal autorizada. Todos los intereses se calcularan sobre los saldos "
        "de capital principal adeudados. EL DEUDOR renuncia expresamente a cualquier "
        "requerimiento de constitucion en mora.", ss["P"]))

    el.append(Paragraph("7. Seguro deudores.", ss["H"]))
    el.append(Paragraph(
        "EL DEUDOR se obliga a constituir y endosar en favor de EL ACREEDOR una poliza de "
        "vida deudores. En caso de no presentarla, autoriza a EL ACREEDOR para tomar el "
        "seguro por cuenta de EL DEUDOR.", ss["P"]))

    el.append(Paragraph("8. Independencia del negocio juridico.", ss["H"]))
    el.append(Paragraph(
        "Salvo el ejercicio del derecho de retracto o reversion, EL DEUDOR no podra oponer a "
        "EL ACREEDOR ninguna excepcion derivada de la compraventa celebrada con el Aliado "
        "Comercial, por tratarse de un contrato independiente al mutuo.", ss["P"]))

    el.append(Paragraph("9. Gestion de cobranza pre-judicial y/o judicial.", ss["H"]))
    el.append(Paragraph(
        "Los gastos de la gestion de cobro pre-judicial y judicial seran asumidos por EL "
        "DEUDOR y se agregaran a la deuda a cargo, en caso de generarse.", ss["P"]))

    el.append(Paragraph("10. Tratamiento de datos personales.", ss["H"]))
    el.append(Paragraph(
        "EL DEUDOR autoriza de manera expresa, previa e informada a EL ACREEDOR y a las "
        "Empresas Vinculadas el tratamiento de sus datos personales para el cumplimiento de "
        "obligaciones legales, gestion de mercadeo, verificacion de identidad, estudio de "
        "credito y comportamiento de pago, y consulta y reporte ante Centrales de Informacion "
        "Financiera, conforme a las politicas de tratamiento de datos disponibles en los "
        "canales de EL ACREEDOR y las Empresas Vinculadas.", ss["P"]))

    el.append(Paragraph("11. Firma electronica.", ss["H"]))
    el.append(Paragraph(
        "EL DEUDOR acepta que este documento y cualquier otro requerido para el "
        "perfeccionamiento del contrato prometido, queda satisfecho y tendra plenos efectos "
        "juridicos con su aceptacion o firma por medios electronicos.", ss["P"]))

    el.append(Spacer(1, 8))
    el.append(Paragraph(
        "El (los) DEUDOR(es) identificado(s) a continuacion manifiesta(n) conocer, entender "
        "y aceptar las condiciones de este Contrato de Promesa de Mutuo propuesto por "
        "GASES DEL ORIENTE S.A. E.S.P. Se firma el dia <b>{{fecha}}</b>.", ss["P"]))
    el.append(Spacer(1, 6))
    el.append(firma_block(ss, "DEUDOR"))

    return el


# ----------------------------------------------------------------------
# PAGARE EN BLANCO CON CARTA DE INSTRUCCIONES
# ----------------------------------------------------------------------
def build_pagare(ss):
    el = encabezado(ss)
    el.append(Paragraph("PAGARE No: ______________", ss["TituloDoc"]))
    el.append(Paragraph("Solicitud de Credito: cupo rotativo por COP$ <b>{{monto_cupo}}</b>", ss["P"]))
    el.append(Spacer(1, 6))
    el.append(datos_deudor_table(ss))
    el.append(Spacer(1, 10))

    el.append(Paragraph(
        "El(los) suscrito(s) antes senalado(s), me(nos) obligo(amos) a pagar de manera "
        "incondicional e indivisible a la orden de <b>GASES DEL ORIENTE S.A. E.S.P</b> "
        "NIT. 890.503.900-2, en adelante <b>EL ACREEDOR</b>, de su endosatario o legitimo "
        "tenedor, el dia que EL ACREEDOR indique, en sus oficinas ubicadas en la ciudad de "
        "San Jose de Cucuta, las siguientes sumas de dinero:", ss["P"]))

    montos = [
        [Paragraph("POR CAPITAL:", ss["Campo"]), Paragraph("____________ ($____________)", ss["CampoCell"])],
        [Paragraph("POR INTERESES CAUSADOS Y NO PAGADOS:", ss["Campo"]), Paragraph("____________ ($____________)", ss["CampoCell"])],
        [Paragraph("POR OTROS CONCEPTOS:", ss["Campo"]), Paragraph("____________ ($____________)", ss["CampoCell"])],
    ]
    t = Table(montos, colWidths=[8 * cm, 8.4 * cm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, AZUL),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, HexColor("#c7d6e5")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    el.append(Spacer(1, 6))
    el.append(t)
    el.append(Spacer(1, 8))

    el.append(Paragraph(
        "Este pagare se suscribe para ser llenado por EL ACREEDOR, en cualquier tiempo y sin "
        "previo aviso, segun las siguientes instrucciones:", ss["P"]))

    instrucciones = [
        "El Pagare podra ser llenado ante el incumplimiento o mora de cualquiera de las "
        "obligaciones individuales o conjuntas a cargo del DEUDOR, asociadas al pagare mismo, "
        "al contrato de mutuo y cualquier otro documento suscrito por el DEUDOR.",
        "Se incorporaran en el Pagare todas las obligaciones existentes con EL ACREEDOR, "
        "incluyendo capital, intereses remuneratorios, intereses de mora a la tasa maxima "
        "legal, gastos de cobranza, honorarios de abogado e impuestos.",
        "La fecha de vencimiento correspondera al dia en que sea llenado el pagare.",
        "El valor del capital se llenara con el monto de todas las obligaciones exigibles a "
        "cargo del DEUDOR y a favor de EL ACREEDOR.",
        "Los intereses causados y no pagados corresponderan tanto a intereses de plazo como "
        "de mora, derivados de las obligaciones a cargo del DEUDOR.",
        "El valor de otros conceptos se llenara con el monto de todas las sumas que por "
        "cualquier otro concepto deba el DEUDOR a EL ACREEDOR (prima de seguro deudores, "
        "impuestos, honorarios de abogado, gastos de cobranza, entre otros).",
        "EL ACREEDOR queda expresamente facultado para aclarar, enmendar y corregir errores "
        "involuntarios en el diligenciamiento de este pagare.",
        "El numero del Pagare correspondera a aquel que le asigne EL ACREEDOR.",
        "El (los) DEUDOR(es) renuncia(n) expresamente a cualquier requerimiento para ser "
        "constituido(s) en mora.",
    ]
    for i, txt in enumerate(instrucciones, start=1):
        el.append(Paragraph(f"1.{i}. {txt}", ss["P"]))

    el.append(Spacer(1, 6))
    el.append(Paragraph(
        "Declaro(amos) expresamente haber recibido copia del Pagare y acepto(amos) "
        "suscribirlo a traves de cualquier mecanismo de firma electronica dispuesto por "
        "EL ACREEDOR. Para constancia se firma en la ciudad de San Jose de Cucuta, "
        "Norte de Santander el dia <b>{{fecha}}</b>.", ss["P"]))

    el.append(Spacer(1, 8))
    el.append(firma_block(ss, "DEUDOR"))

    return el


def render(nombre_archivo, flowables):
    ruta = os.path.join(OUT_DIR, nombre_archivo)
    doc = SimpleDocTemplate(
        ruta, pagesize=letter,
        leftMargin=1.9 * cm, rightMargin=1.9 * cm,
        topMargin=1.6 * cm, bottomMargin=1.6 * cm,
        title=nombre_archivo,
    )
    doc.build(flowables)
    print("Generado:", ruta)


if __name__ == "__main__":
    ss = styles()
    render("Promesa_Mutuo.pdf", build_promesa(ss))
    ss = styles()  # reiniciar stylesheet para evitar duplicados
    render("Pagare.pdf", build_pagare(ss))
    print("Listo. Los placeholders {{...}} son las zonas a marcar como campos dinamicos en Docusign.")
