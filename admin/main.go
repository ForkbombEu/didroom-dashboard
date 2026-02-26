// SPDX-FileCopyrightText: 2024 The Forkbomb Company
//
// SPDX-License-Identifier: AGPL-3.0-or-later

package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"pb/ca"
	"pb/config"
	"pb/did"
	"pb/hooks"
	_ "pb/migrations"
	"pb/zencode"

	"github.com/labstack/echo/v5"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	"pb/webauthn"
)

type EmailCheckResponse struct {
	Exists bool `json:"exists"`
}

func main() {
	app := pocketbase.New()
	var publicDirFlag string

	// add "--publicDir" option flag
	app.RootCmd.PersistentFlags().StringVar(
		&publicDirFlag,
		"publicDir",
		defaultPublicDir(),
		"the directory to serve static files",
	)

	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		// serve static files
		spa_mode := true // missing routes serve index.html
		e.Router.GET("/*", apis.StaticDirectoryHandler(os.DirFS(publicDirFlag), spa_mode))

		e.Router.AddRoute(echo.Route{
			Method: http.MethodPost,
			Path:   "/api/keypairoom-server",
			Handler: func(c echo.Context) error {
				var body map[string]map[string]interface{}

				conf, err := config.FetchKeypairoomConfig(app)
				if err != nil {
					return err
				}

				err = json.NewDecoder(c.Request().Body).Decode(&body)
				if err != nil {
					return err
				}
				hmac, err := zencode.KeypairoomServer(conf, body["userData"])
				if err != nil {
					return err
				}

				return c.JSON(http.StatusOK, map[string]string{"hmac": hmac})
			},
			Middlewares: []echo.MiddlewareFunc{
				apis.ActivityLogger(app),
			},
		})

		e.Router.AddRoute(echo.Route{
			Method: http.MethodGet,
			Path:   "/api/email-check",
			Handler: func(c echo.Context) error {
				email := c.QueryParam("email")

				if email == "" {
					return c.JSON(http.StatusBadRequest, map[string]string{"error": "email query parameter is required"})
				}

				user, err := app.Dao().FindFirstRecordByFilter("users", "email = {:email}", dbx.Params{"email": email})

				if err != nil {
					response := EmailCheckResponse{Exists: false}
					return c.JSON(http.StatusOK, response)
				}

				response := EmailCheckResponse{Exists: user != nil}
				return c.JSON(http.StatusOK, response)
			},
		})

		e.Router.AddRoute(echo.Route{
			Method: http.MethodGet,
			Path:   "/api/did",
			Handler: func(c echo.Context) error {
				authRecord, _ := c.Get(apis.ContextAuthRecordKey).(*models.Record)
				if authRecord == nil {
					return apis.NewForbiddenError("Only auth records can access this endpoint", nil)
				}

				publicKeys, err := app.Dao().FindFirstRecordByFilter("users_public_keys", "owner = {:owner_id}", dbx.Params{"owner_id": authRecord.Id})
				if err != nil {
					return apis.NewForbiddenError("Only users with public keys can access this endpoint", nil)
				}

				conf, err := config.FetchDidConfig(app)
				if err != nil {
					return err
				}

				did, err := did.ClaimDid(conf, &did.DidAgent{
					BitcoinPublicKey: publicKeys.Get("bitcoin_public_key").(string),
					EcdhPublicKey:    publicKeys.Get("ecdh_public_key").(string),
					EddsaPublicKey:   publicKeys.Get("eddsa_public_key").(string),
					EthereumAddress:  publicKeys.Get("ethereum_address").(string),
					ReflowPublicKey:  publicKeys.Get("reflow_public_key").(string),
					Es256PublicKey:   publicKeys.Get("es256_public_key").(string),
				})
				if err != nil {
					return err
				}

				return c.JSON(http.StatusOK, did)
			},
			Middlewares: []echo.MiddlewareFunc{
				apis.ActivityLogger(app),
			},
		})

		// Initialize Installation CA
		installCA, err := ca.Init(app.DataDir())
		if err != nil {
			log.Printf("WARNING: Failed to initialize Installation CA: %v", err)
		} else {
			log.Printf("Installation CA initialized (Subject: %s)", installCA.Certificate.Subject.CommonName)
		}

		// GET /api/ca/certificate - Download the CA certificate (PEM)
		e.Router.AddRoute(echo.Route{
			Method: http.MethodGet,
			Path:   "/api/ca/certificate",
			Handler: func(c echo.Context) error {
				installCA, err := ca.Get()
				if err != nil {
					return c.JSON(http.StatusInternalServerError, map[string]string{"error": "CA not available"})
				}
				c.Response().Header().Set("Content-Type", "application/x-pem-file")
				c.Response().Header().Set("Content-Disposition", "attachment; filename=\"signroom-ca.crt\"")
				return c.Blob(http.StatusOK, "application/x-pem-file", installCA.GetCertPEM())
			},
			Middlewares: []echo.MiddlewareFunc{
				apis.ActivityLogger(app),
			},
		})

		// POST /api/ca/sign - Sign a CSR and return the signed certificate
		e.Router.AddRoute(echo.Route{
			Method: http.MethodPost,
			Path:   "/api/ca/sign",
			Handler: func(c echo.Context) error {
				authRecord, _ := c.Get(apis.ContextAuthRecordKey).(*models.Record)
				if authRecord == nil {
					return apis.NewForbiddenError("Only authenticated users can request certificate signing", nil)
				}

				installCA, err := ca.Get()
				if err != nil {
					return c.JSON(http.StatusInternalServerError, map[string]string{"error": "CA not available"})
				}

				// Accept CSR in base64-encoded DER format in JSON body
				var body struct {
					CSR string `json:"csr"`
				}
				if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
					return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
				}

				csrDER, err := base64.StdEncoding.DecodeString(body.CSR)
				if err != nil {
					return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid CSR encoding (expected base64 DER)"})
				}

				certPEM, err := installCA.SignCSR(csrDER)
				if err != nil {
					return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("failed to sign CSR: %v", err)})
				}

				return c.JSON(http.StatusOK, map[string]string{"certificate": string(certPEM)})
			},
			Middlewares: []echo.MiddlewareFunc{
				apis.ActivityLogger(app),
				apis.RequireRecordAuth(),
			},
		})

		// GET /api/ca/certificate/base64 - Get CA cert as base64 (for use in certificateChain)
		e.Router.AddRoute(echo.Route{
			Method: http.MethodGet,
			Path:   "/api/ca/certificate/base64",
			Handler: func(c echo.Context) error {
				installCA, err := ca.Get()
				if err != nil {
					return c.JSON(http.StatusInternalServerError, map[string]string{"error": "CA not available"})
				}
				// Return the raw cert bytes (DER) as base64 - same format DSS expects
				certBase64 := base64.StdEncoding.EncodeToString(installCA.Certificate.Raw)
				return c.JSON(http.StatusOK, map[string]string{"certificate": certBase64})
			},
			Middlewares: []echo.MiddlewareFunc{
				apis.ActivityLogger(app),
			},
		})

		return nil
	})

	webauthn.Register(app)
	hooks.Register(app)
	jsvm.MustRegister(app, jsvm.Config{
		HooksWatch: true,
	})
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  true,
	})
	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func defaultPublicDir() string {
	if strings.HasPrefix(os.Args[0], os.TempDir()) {
		// most likely ran with go run
		return "./pb_public"
	}

	return filepath.Join(os.Args[0], "../pb_public")
}
