UPDATE `users`
SET `role` = 'Administrativo',
    `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE `username` = 'admin'
  AND `role` = 'Gestor';
