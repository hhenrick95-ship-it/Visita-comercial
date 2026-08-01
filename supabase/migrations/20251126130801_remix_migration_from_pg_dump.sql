CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedbacks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visit_form_id uuid NOT NULL,
    vendor_code text NOT NULL,
    supervisor text NOT NULL,
    constructive_criticism text NOT NULL,
    action_plan text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    pdf_path text
);


--
-- Name: teams_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams_vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cod_equipe text NOT NULL,
    nome_equipe text NOT NULL,
    cod_vendedor text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: visit_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    submitted_at timestamp with time zone DEFAULT now(),
    latitude numeric(10,8),
    longitude numeric(11,8),
    visit_date date NOT NULL,
    manager text NOT NULL,
    rca_accompanied text NOT NULL,
    client_code text NOT NULL,
    prices_visible_correct boolean NOT NULL,
    has_activation_promotion boolean NOT NULL,
    activation_promotion_details text,
    has_merchandising_material boolean NOT NULL,
    merchandising_material_details text,
    has_promotional_gift boolean NOT NULL,
    promotional_gift_details text,
    adequate_assortment_available boolean NOT NULL,
    ruptures_description text,
    vendor_follows_visit_frequency boolean NOT NULL,
    vendor_applied_positivation boolean NOT NULL,
    vendor_observations text,
    relationship_level integer,
    execution_level integer,
    delivery_level integer,
    has_mix_expansion_opportunities boolean NOT NULL,
    mix_expansion_details text,
    has_visibility_improvement_opportunities boolean NOT NULL,
    visibility_improvement_details text,
    additional_comments text,
    address text,
    pdf_path text,
    CONSTRAINT visit_forms_delivery_level_check CHECK (((delivery_level >= 1) AND (delivery_level <= 5))),
    CONSTRAINT visit_forms_execution_level_check CHECK (((execution_level >= 1) AND (execution_level <= 5))),
    CONSTRAINT visit_forms_relationship_level_check CHECK (((relationship_level >= 1) AND (relationship_level <= 5)))
);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: teams_vendors teams_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_vendors
    ADD CONSTRAINT teams_vendors_pkey PRIMARY KEY (id);


--
-- Name: visit_forms visit_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_forms
    ADD CONSTRAINT visit_forms_pkey PRIMARY KEY (id);


--
-- Name: idx_feedbacks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedbacks_created_at ON public.feedbacks USING btree (created_at);


--
-- Name: idx_feedbacks_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedbacks_supervisor ON public.feedbacks USING btree (supervisor);


--
-- Name: idx_feedbacks_vendor_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedbacks_vendor_code ON public.feedbacks USING btree (vendor_code);


--
-- Name: idx_teams_vendors_equipe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_vendors_equipe ON public.teams_vendors USING btree (cod_equipe);


--
-- Name: idx_teams_vendors_nome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_vendors_nome ON public.teams_vendors USING btree (nome_equipe);


--
-- Name: idx_visit_forms_client_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visit_forms_client_code ON public.visit_forms USING btree (client_code);


--
-- Name: idx_visit_forms_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visit_forms_date ON public.visit_forms USING btree (visit_date DESC);


--
-- Name: idx_visit_forms_manager; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visit_forms_manager ON public.visit_forms USING btree (manager);


--
-- Name: feedbacks Anyone can read feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read feedbacks" ON public.feedbacks FOR SELECT USING (true);


--
-- Name: teams_vendors Anyone can read teams_vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read teams_vendors" ON public.teams_vendors FOR SELECT USING (true);


--
-- Name: visit_forms Anyone can read visit forms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read visit forms" ON public.visit_forms FOR SELECT USING (true);


--
-- Name: feedbacks Anyone can submit feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit feedbacks" ON public.feedbacks FOR INSERT WITH CHECK (true);


--
-- Name: visit_forms Anyone can submit visit forms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit visit forms" ON public.visit_forms FOR INSERT WITH CHECK (true);


--
-- Name: feedbacks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

--
-- Name: teams_vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams_vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: visit_forms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visit_forms ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


