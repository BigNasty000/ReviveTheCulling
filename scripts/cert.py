from Crypto.PublicKey import RSA

# Generate a new 1024-bit key
key = RSA.generate(1024)

# Save our private key for the server
with open("../certs/private.key", "wb") as f:
    f.write(key.export_key())

# --- THIS IS THE IMPORTANT PART ---
# Get the modulus (n) as a large integer
modulus_int = key.n

# Convert it to a byte string. A 1024-bit key has a 128-byte modulus.
# The 'big' means most significant byte first, which is standard.
modulus_bytes = modulus_int.to_bytes(128, 'big')

print("--- Your New Private Key is in 'private.key' ---")
print("This is the byte pattern of your NEW public key's modulus.")
print("You will patch this INTO the executable:")
print(modulus_bytes.hex())

# Just for reference, the public exponent is almost always 65537 (0x10001)
print("\nExponent:", key.e)