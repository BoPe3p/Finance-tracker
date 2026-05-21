"""
Categorización automática de transacciones por regex.
Misma lógica que Fernando pero en Python — más fácil de extender.
"""

import re

RULES: list[tuple[str, list[str]]] = [
    ("Supermercado", ["lider", "jumbo", "tottus", "unimarc", "santa isabel", "acuenta"]),
    ("Transporte", ["uber", "cabify", "bip!", "copec", "shell", "esso", "petrobras", "transantiago", "metro"]),
    ("Entretenimiento", ["netflix", "spotify", "steam", "disney", "hbo", "amazon prime", "prime video", "apple tv", "youtube premium"]),
    ("Salud", ["farmacia", "farmacias", "salcobrand", "cruz verde", "ahumada", "clinica", "hospital", "medica", "dental", "gym", "smartfit"]),
    ("Restaurant", ["mcdonalds", "burger king", "subway", "dominos", "pizza", "rappi", "pedidosya", "ifood", "sushi", "restaurant", "cafe", "cafeteria"]),
    ("Servicios", ["entel", "movistar", "claro", "wom", "vtr", "gtd", "enel", "aguas", "esval", "metrogas"]),
    ("Hogar", ["easy", "sodimac", "paris", "falabella hogar", "ikea", "homecenter"]),
    ("Educación", ["duoc", "udp", "uc", "usach", "utem", "inacap", "coursera", "udemy", "platzi"]),
    ("Sueldo", ["sueldo", "remuneracion", "salario", "honorario", "pago nomina"]),
    ("Transferencia", ["transferencia", "traspaso", "depósito", "deposito"]),
]


def categorize(description: str) -> str:
    """
    Recibe la descripción de una transacción y retorna el nombre de la categoría.
    Si no hay coincidencia, retorna 'Otro'.
    """
    desc_lower = description.lower()
    for category_name, keywords in RULES:
        for keyword in keywords:
            if re.search(keyword, desc_lower):
                return category_name
    return "Otro"
