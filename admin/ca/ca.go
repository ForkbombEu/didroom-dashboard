// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

package ca

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// InstallationCA holds the CA certificate and private key for the Signroom installation.
type InstallationCA struct {
	Certificate *x509.Certificate
	PrivateKey  *ecdsa.PrivateKey
	CertPEM     []byte
}

var (
	instance *InstallationCA
	once     sync.Once
	initErr  error
)

func caDir(dataDir string) string {
	return filepath.Join(dataDir, "ca")
}

func certPath(dataDir string) string {
	return filepath.Join(caDir(dataDir), "ca.crt")
}

func keyPath(dataDir string) string {
	return filepath.Join(caDir(dataDir), "ca.key")
}

// Init initializes the installation CA. If CA files exist on disk, they are loaded.
// If not, a new CA keypair and self-signed CA certificate are generated.
// dataDir should be the PocketBase data directory (e.g., "./pb_data").
func Init(dataDir string) (*InstallationCA, error) {
	once.Do(func() {
		instance, initErr = loadOrCreate(dataDir)
	})
	return instance, initErr
}

// Get returns the initialized CA instance. Must call Init first.
func Get() (*InstallationCA, error) {
	if instance == nil {
		return nil, fmt.Errorf("CA not initialized, call ca.Init() first")
	}
	return instance, nil
}

// GetCertPEM returns the CA certificate in PEM format (public, distributable).
func (c *InstallationCA) GetCertPEM() []byte {
	return c.CertPEM
}

// SignCSR takes a DER-encoded PKCS#10 Certificate Signing Request,
// validates it, and returns a signed leaf certificate in PEM format.
func (c *InstallationCA) SignCSR(csrDER []byte) ([]byte, error) {
	csr, err := x509.ParseCertificateRequest(csrDER)
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSR: %w", err)
	}

	if err := csr.CheckSignature(); err != nil {
		return nil, fmt.Errorf("CSR signature verification failed: %w", err)
	}

	serialNumber, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return nil, fmt.Errorf("failed to generate serial number: %w", err)
	}

	yesterday := time.Now().AddDate(0, 0, -1)
	notAfter := yesterday.AddDate(1, 0, 0)

	template := &x509.Certificate{
		SerialNumber: serialNumber,
		Subject:      csr.Subject,
		NotBefore:    yesterday,
		NotAfter:     notAfter,
		KeyUsage:     x509.KeyUsageDigitalSignature | x509.KeyUsageContentCommitment,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageAny},
		DNSNames:     csr.DNSNames,
		URIs:         csr.URIs,

		BasicConstraintsValid: true,
		IsCA:                  false,
	}

	if len(csr.EmailAddresses) > 0 {
		template.EmailAddresses = csr.EmailAddresses
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, c.Certificate, csr.PublicKey, c.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to sign certificate: %w", err)
	}

	certPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certDER,
	})

	return certPEM, nil
}

func loadOrCreate(dataDir string) (*InstallationCA, error) {
	dir := caDir(dataDir)
	cPath := certPath(dataDir)
	kPath := keyPath(dataDir)

	if fileExists(cPath) && fileExists(kPath) {
		return loadCA(cPath, kPath)
	}

	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create CA directory: %w", err)
	}

	return createCA(cPath, kPath)
}

func loadCA(certFile, keyFile string) (*InstallationCA, error) {
	certPEM, err := os.ReadFile(certFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read CA certificate: %w", err)
	}

	keyPEM, err := os.ReadFile(keyFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read CA private key: %w", err)
	}

	certBlock, _ := pem.Decode(certPEM)
	if certBlock == nil {
		return nil, fmt.Errorf("failed to decode CA certificate PEM")
	}
	cert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse CA certificate: %w", err)
	}

	keyBlock, _ := pem.Decode(keyPEM)
	if keyBlock == nil {
		return nil, fmt.Errorf("failed to decode CA private key PEM")
	}
	key, err := x509.ParseECPrivateKey(keyBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse CA private key: %w", err)
	}

	return &InstallationCA{
		Certificate: cert,
		PrivateKey:  key,
		CertPEM:     certPEM,
	}, nil
}

func createCA(certFile, keyFile string) (*InstallationCA, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate CA key: %w", err)
	}

	serialNumber, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return nil, fmt.Errorf("failed to generate serial number: %w", err)
	}

	now := time.Now()
	template := &x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			CommonName:   "Signroom Installation CA",
			Organization: []string{"Signroom"},
		},
		NotBefore:             now.AddDate(0, 0, -1),
		NotAfter:              now.AddDate(10, 0, 0),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
		BasicConstraintsValid: true,
		IsCA:                  true,
		MaxPathLen:            0,
		MaxPathLenZero:        true,
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create CA certificate: %w", err)
	}

	certPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certDER,
	})

	keyDER, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal CA private key: %w", err)
	}
	keyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "EC PRIVATE KEY",
		Bytes: keyDER,
	})

	if err := os.WriteFile(certFile, certPEM, 0644); err != nil {
		return nil, fmt.Errorf("failed to write CA certificate: %w", err)
	}
	if err := os.WriteFile(keyFile, keyPEM, 0600); err != nil {
		return nil, fmt.Errorf("failed to write CA private key: %w", err)
	}

	cert, err := x509.ParseCertificate(certDER)
	if err != nil {
		return nil, fmt.Errorf("failed to parse generated CA certificate: %w", err)
	}

	return &InstallationCA{
		Certificate: cert,
		PrivateKey:  privateKey,
		CertPEM:     certPEM,
	}, nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
