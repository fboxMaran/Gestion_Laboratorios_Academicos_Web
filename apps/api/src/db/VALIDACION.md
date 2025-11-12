# ✅ Validación de Instalación

Este documento te ayuda a verificar que la base de datos se instaló correctamente.

## Paso 1: Verificar Tablas Creadas

```powershell
$env:PGPASSWORD='tu_password'; psql -U postgres -d gestion_laboratorios -c "\dt"
```

**Resultado esperado:** Deberías ver **32 tablas** listadas.

---

## Paso 2: Verificar Usuarios de Prueba

```powershell
$env:PGPASSWORD='tu_password'; psql -U postgres -d gestion_laboratorios -c "SELECT id, full_name, email, role_id FROM app_user;"
```

**Resultado esperado:** Deberías ver **8 usuarios**:
```
 id |        full_name          |           email            | role_id 
----+---------------------------+----------------------------+---------
  1 | Juan Pablo Cambronero     | usuario@demo.edu           |       1
  2 | Dr. Carlos Ramirez Lopez  | profesor@itcr.ac.cr        |       2
  3 | Juan Tecnico Mora         | tecnico@demo.edu           |       3
  4 | Ana Admin Castro          | admin@itcr.ac.cr           |       4
  5 | Maria Gonzalez Perez      | mgonzalez@estudiantec.cr   |       1
  6 | Pedro Jimenez Vargas      | pjimenez@estudiantec.cr    |       1
  7 | Dra. Sofia Morales        | smorales@itcr.ac.cr        |       2
  8 | Luis Martinez Tech        | lmartinez@itcr.ac.cr       |       3
```

---

## Paso 3: Verificar Laboratorios

```powershell
$env:PGPASSWORD='tu_password'; psql -U postgres -d gestion_laboratorios -c "SELECT id, name, location FROM lab;"
```

**Resultado esperado:** Deberías ver **5 laboratorios**.

---

## Paso 4: Verificar Recursos

```powershell
$env:PGPASSWORD='tu_password'; psql -U postgres -d gestion_laboratorios -c "SELECT COUNT(*) as total_recursos FROM resource;"
```

**Resultado esperado:** `total_recursos = 25`

---

## Paso 5: Probar Login desde la API

**Asegúrate de que el servidor esté corriendo:**
```powershell
cd apps/api
node src/server.js
```

**En otra terminal, prueba el login:**
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"usuario@demo.edu","password":"demo123"}'
Write-Host "Token obtenido: $($response.token.Substring(0,20))..."
Write-Host "Usuario: $($response.user.full_name)"
```

**Resultado esperado:**
```
Token obtenido: eyJhbGciOiJIUzI1NiIs...
Usuario: Juan Pablo Cambronero
```

---

## Paso 6: Verificar Notificaciones

```powershell
# Usando el token del paso anterior
$token = (Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"usuario@demo.edu","password":"demo123"}').token

$notifs = Invoke-RestMethod -Uri "http://localhost:3000/api/notifications" -Headers @{"Authorization"="Bearer $token"}

Write-Host "Total de notificaciones: $($notifs.Count)"
```

**Resultado esperado:** `Total de notificaciones: 0` (o cualquier número, sin errores)

---

## ✅ Checklist Final

- [ ] 32 tablas creadas correctamente
- [ ] 8 usuarios con passwords hasheadas
- [ ] 5 laboratorios con datos completos
- [ ] 25 recursos distribuidos en los labs
- [ ] Login funciona con `demo123`
- [ ] API devuelve datos correctamente
- [ ] No hay errores en consola del servidor

---

## 🆘 Problemas Comunes

### Error: "database does not exist"
**Solución:** Ejecuta primero `createdb gestion_laboratorios`

### Error: "relation already exists"
**Solución:** El script es idempotente. Ignora esta advertencia, las tablas se recrearán.

### Error: "password authentication failed"
**Solución:** Verifica tu contraseña de PostgreSQL. Reemplaza `tu_password` con la correcta.

### El login devuelve 401 Unauthorized
**Solución:** Verifica que:
1. El servidor esté corriendo en puerto 3000
2. La base de datos tenga los usuarios con passwords hasheadas
3. El archivo `.env` tenga `JWT_SECRET` configurado

---

## 📞 Contacto

Si encuentras algún problema durante la instalación, contáctame y lo resolvemos juntos.
