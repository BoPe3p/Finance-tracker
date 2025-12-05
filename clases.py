class Gasto:
    def __init__(self, name, categoria, cantidad) -> None:
        self.name = name
        self.categoria = categoria
        self.cantidad = cantidad

    def __repr__(self):
        return f'Gasto: {self.name}, Categoria: {self.categoria}, Cantidad: {self.cantidad}'

class Inversion:
    def __init__(self, name, sign, invertido) -> None:
        self.name = name
        self.sign = sign
        self.invertido = invertido
        self.precio_actual = 0
        self.valor_total = 0

    def __repr__(self):
        return f'Inversion: {self.name}, Invertido: {self.invertido}, Valor inversion: {self.valor_total}'

class Deposito:
    def __init__(self, name, cantidad) -> None:
        self.name = name
        self.cantidad = cantidad

    def __repr__(self):
        return f'Gasto: {self.name}, Cantidad: {self.cantidad}'

class Saldo:
    def __init__(self, name) -> None:
        self.name = name
        self.saldo = 0
