"""
LDAP authentication against the Windows AD domain controller.

Kept separate from app.py so the auth logic can be tested/reasoned about
independently of Flask routing.
"""

import os
import ssl

from ldap3 import Server, Connection, Tls
from ldap3.core.exceptions import LDAPException


def _get_config():
    """Read LDAP connection settings from environment variables, with
    sensible defaults matching this project's known-working setup.
    Kept out of code so nothing sensitive/environment-specific is hardcoded."""
    return {
        "host": os.environ.get("LDAP_HOST", "10.0.0.218"),
        "port": int(os.environ.get("LDAP_PORT", "636")),
        "domain": os.environ.get("LDAP_DOMAIN", "training.local"),
    }


def authenticate(username, password):
    """
    Attempt to bind to the DC as the given user.

    Returns (True, None) on success, or (False, error_message) on failure.
    Never raises — callers should just check the boolean.
    """
    if not username or not password:
        return False, "Username and password are required."

    config = _get_config()
    user_principal = f"{username}@{config['domain']}"

    # validate=ssl.CERT_NONE mirrors the TLS_REQCERT allow relaxation applied
    # system-wide on the Ubuntu box for this lab's self-signed/internal-CA cert.
    tls_config = Tls(validate=ssl.CERT_NONE)

    try:
        server = Server(config["host"], port=config["port"], use_ssl=True, tls=tls_config)
        conn = Connection(server, user=user_principal, password=password)

        if not conn.bind():
            return False, "Invalid username or password."

        conn.unbind()
        return True, None

    except LDAPException as e:
        # Distinguish "wrong credentials" from "couldn't reach the server at all",
        # since those need very different troubleshooting.
        return False, f"Could not reach the authentication server: {e}"
