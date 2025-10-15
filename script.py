# Открываем исходный файл и читаем строки
with open('main.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Обрезаем 8 начальных табуляций (или 8 пробелов) в каждой строке
cleaned_lines = [line[8:] if line.startswith(' '*8) else line.lstrip(' ') for line in lines]

# Сохраняем результат в тот же файл или в новый (например, 'style_cleaned.css')
with open('main.js', 'w', encoding='utf-8') as f:
    f.writelines(cleaned_lines)

print('Лишние пробелы удалены. Результат сохранён в main.js')
