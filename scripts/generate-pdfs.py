#!/usr/bin/env python3
"""
Genera los 2 PDFs base para la demo de Elastic Signing de Gases del Oriente.

Cada PDF contiene texto de contrato plausible y PLACEHOLDERS visibles que luego
marcarás como campos dinámicos en la consola web de Docusign:

    {{nombre_cliente}}   {{direccion_predio}}   {{tipo_servicio}}   {{fecha}}

Uso:
    python3 scripts/generate-pdfs.py
Salida:
    docs/Contrato_Suministro_Gas.pdf
    docs/Condiciones_Seguridad_Instalacion.pdf
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

AZUL = HexColor("#12457a")
NARANJA = HexColor("#e8792b")
GRIS = HexColor("#444444")

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")
os.makedirs(OUT_DIR, exist_ok=True)


def styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("Marca", fontName="Helvetica-Bold", fontSize=18,
                          textColor=AZUL, spaceAfter=2))
    ss.add(ParagraphStyle("Sub", fontName="Helvetica", fontSize=9,
                          textColor=NARANJA, spaceAfter=10))
    ss.add(ParagraphStyle("TituloDoc", fontName="Helvetica-Bold", fontSize=14,
                          textColor=AZUL, spaceBefore=6, spaceAfter=10, alignment=TA_CENTER))
    ss.add(ParagraphStyle("H", fontName="Helvetica-Bold", fontSize=10.5,
                          textColor=AZUL, spaceBefore=10, spaceAfter=4))
    ss.add(ParagraphStyle("P", fontName="Helvetica", fontSize=9.5, leading=14,
                          textColor=GRIS, alignment=TA_JUSTIFY, spaceAfter=6))
    ss.add(ParagraphStyle("Campo", fontName="Helvetica-Bold", fontSize=9.5,
                          textColor=AZUL))
    return ss


def encabezado(ss):
    el = [
        Paragraph("Gases del Oriente S.A. E.S.P.", ss["Marca"]),
        Paragraph("Distribución de gas natural domiciliario · Colombia", ss["Sub"]),
        HRFlowable(width="100%", thickness=1.2, color=NARANJA, spaceAfter=10),
    ]
    return el


def tabla_datos(ss):
    """Bloque de datos del cliente con placeholders dinámicos."""
    data = [
        [Paragraph("Cliente:", ss["Campo"]), Paragraph("{{nombre_cliente}}", ss["P"])],
        [Paragraph("Dirección del predio:", ss["Campo"]), Paragraph("{{direccion_predio}}", ss["P"])],
        [Paragraph("Tipo de servicio:", ss["Campo"]), Paragraph("{{tipo_servicio}}", ss["P"])],
        [Paragraph("Fecha:", ss["Campo"]), Paragraph("{{fecha}}", ss["P"])],
    ]
    t = Table(data, colWidths=[5 * cm, 11 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#eef3f8")),
        ("BOX", (0, 0), (-1, -1), 0.6, AZUL),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, HexColor("#c7d6e5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def pie(ss):
    return [
        Spacer(1, 16),
        HRFlowable(width="100%", thickness=0.6, color=HexColor("#c7d6e5"), spaceAfter=8),
        Paragraph(
            "Al hacer clic en el botón de aceptación, el cliente <b>{{nombre_cliente}}</b> "
            "manifiesta su consentimiento libre, expreso e informado respecto de las "
            "condiciones aquí descritas para el predio ubicado en <b>{{direccion_predio}}</b>, "
            "en la fecha <b>{{fecha}}</b>. Este documento se firma electrónicamente mediante "
            "Docusign Elastic Signing.",
            ss["P"],
        ),
    ]


def build_contrato(ss):
    el = encabezado(ss)
    el.append(Paragraph("CONTRATO DE SUMINISTRO DE GAS NATURAL", ss["TituloDoc"]))
    el.append(tabla_datos(ss))
    el.append(Spacer(1, 10))

    el.append(Paragraph("PRIMERA. Objeto.", ss["H"]))
    el.append(Paragraph(
        "Gases del Oriente S.A. E.S.P. (en adelante, la Empresa) se obliga a prestar el "
        "servicio público domiciliario de distribución y comercialización de gas natural "
        "al cliente <b>{{nombre_cliente}}</b>, en la modalidad <b>{{tipo_servicio}}</b>, "
        "para el inmueble ubicado en <b>{{direccion_predio}}</b>, de conformidad con las "
        "condiciones uniformes del contrato y la regulación vigente (CREG).", ss["P"]))

    el.append(Paragraph("SEGUNDA. Condiciones de la prestación.", ss["H"]))
    el.append(Paragraph(
        "El suministro se prestará de forma continua y eficiente, sujeto a las condiciones "
        "técnicas de la red de distribución. La Empresa medirá el consumo mediante el "
        "instrumento de medida instalado en el predio y facturará según las tarifas "
        "aprobadas para la categoría <b>{{tipo_servicio}}</b>.", ss["P"]))

    el.append(Paragraph("TERCERA. Obligaciones del cliente.", ss["H"]))
    el.append(Paragraph(
        "El cliente se obliga a: (i) pagar oportunamente las facturas; (ii) permitir el "
        "acceso del personal autorizado para revisión, mantenimiento y toma de lecturas; "
        "(iii) usar el gas natural exclusivamente para el fin declarado; y (iv) informar "
        "cualquier anomalía en las instalaciones internas del predio {{direccion_predio}}.", ss["P"]))

    el.append(Paragraph("CUARTA. Facturación y pago.", ss["H"]))
    el.append(Paragraph(
        "La Empresa expedirá factura mensual. El no pago dentro del plazo dará lugar a "
        "intereses de mora y, eventualmente, a la suspensión del servicio conforme a la ley "
        "142 de 1994 y demás normas concordantes.", ss["P"]))

    el.append(Paragraph("QUINTA. Vigencia.", ss["H"]))
    el.append(Paragraph(
        "El presente contrato rige a partir de la fecha <b>{{fecha}}</b> y tendrá duración "
        "indefinida, sin perjuicio de las causales de terminación previstas en la ley y en "
        "las condiciones uniformes del servicio.", ss["P"]))

    el += pie(ss)
    return el


def build_seguridad(ss):
    el = encabezado(ss)
    el.append(Paragraph("CONDICIONES DE SEGURIDAD E INSTALACIÓN", ss["TituloDoc"]))
    el.append(tabla_datos(ss))
    el.append(Spacer(1, 10))

    el.append(Paragraph("1. Instalación interna.", ss["H"]))
    el.append(Paragraph(
        "La instalación interna del predio <b>{{direccion_predio}}</b> deberá cumplir la "
        "norma NTC 2505 y ser ejecutada y certificada por un instalador autorizado. El "
        "cliente <b>{{nombre_cliente}}</b> declara conocer que ninguna persona no autorizada "
        "debe manipular la acometida ni el centro de medición.", ss["P"]))

    el.append(Paragraph("2. Ventilación y uso seguro.", ss["H"]))
    el.append(Paragraph(
        "Los espacios donde se instalen artefactos a gas deben contar con ventilación "
        "adecuada. Para el servicio <b>{{tipo_servicio}}</b>, el cliente se compromete a "
        "mantener libres las rejillas de ventilación y a no obstruir los ductos de "
        "evacuación de gases de combustión.", ss["P"]))

    el.append(Paragraph("3. Detección de fugas.", ss["H"]))
    el.append(Paragraph(
        "Ante olor a gas, el cliente debe: cerrar la llave de paso, no accionar "
        "interruptores eléctricos, ventilar el área y comunicarse de inmediato con la línea "
        "de emergencias de Gases del Oriente. La Empresa no se hace responsable por daños "
        "derivados de manipulaciones indebidas de la instalación interna.", ss["P"]))

    el.append(Paragraph("4. Revisiones periódicas.", ss["H"]))
    el.append(Paragraph(
        "El cliente autoriza y facilita las revisiones periódicas de seguridad que la "
        "Empresa realice sobre la instalación del predio, conforme a la regulación vigente, "
        "a partir de la fecha <b>{{fecha}}</b>.", ss["P"]))

    el.append(Paragraph("5. Declaración de aceptación.", ss["H"]))
    el.append(Paragraph(
        "El cliente <b>{{nombre_cliente}}</b> declara haber leído y comprendido estas "
        "condiciones de seguridad e instalación y se compromete a cumplirlas para garantizar "
        "el uso seguro del gas natural en su predio.", ss["P"]))

    el += pie(ss)
    return el


def render(nombre_archivo, flowables):
    ruta = os.path.join(OUT_DIR, nombre_archivo)
    doc = SimpleDocTemplate(
        ruta, pagesize=letter,
        leftMargin=2.2 * cm, rightMargin=2.2 * cm,
        topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        title=nombre_archivo,
    )
    doc.build(flowables)
    print("Generado:", ruta)


if __name__ == "__main__":
    ss = styles()
    render("Contrato_Suministro_Gas.pdf", build_contrato(ss))
    ss = styles()  # reiniciar stylesheet para evitar duplicados
    render("Condiciones_Seguridad_Instalacion.pdf", build_seguridad(ss))
    print("Listo. Los placeholders {{...}} son las zonas a marcar como campos dinámicos en Docusign.")
