class JobDibatalkan(Exception):
    """Dilempar oleh callback on_progress untuk membatalkan job.

    Dibedakan dari kegagalan biasa: bot mengembalikan status 'dibatalkan'.
    """
